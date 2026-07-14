import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Service-role client for privileged writes (seeds, etc.) that bypass RLS.
    // Role validation is done explicitly via the callerRole payload field.
    const adminDb = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { action, payload } = await req.json();

    if (action === 'getDashboard') {
      const { data, error } = await supabase.rpc('get_admin_dashboard');
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getFarmers') {
      const { status, search } = payload;
      let query = supabase.from('profiles').select('*, users!profiles_app_user_id_fkey(*, farmer_profiles(*))').eq('role', 'farmer');
      if (status) query = query.eq('status', status);
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      const result = data.map((p: any) => {
        const fp = p.users?.farmer_profiles;
        return {
          id: p.app_user_id, name: p.name, email: p.email, phone: p.phone, status: p.status, created_at: p.created_at, verified_at: p.updated_at,
          address: fp?.address, acres_of_land: fp?.acres_of_land, crop_address: fp?.crop_address, bank_status: fp?.bank_status
        };
      });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getFarmerDetails') {
      const { farmerId } = payload;
      // Get profile data (source of truth) and business data from users
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('app_user_id', farmerId).eq('role', 'farmer').maybeSingle();
      const { data: user, error: userErr } = await supabase.from('users').select('*, farmer_profiles(*)').eq('id', farmerId).maybeSingle();
      if (profileErr && userErr) throw profileErr || userErr;
      const { data: crops } = await supabase.from('crops').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      const { data: transactions } = await supabase.from('transactions').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      const { data: visits } = await supabase.from('farm_visits').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      const { data: grainSales } = await supabase.from('grain_sales').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      
      // Merge profile (canonical) with business data
      const farmerData = {
        ...(user || {}),
        ...(user?.farmer_profiles || {}),
        name: profile?.name || user?.name,
        email: profile?.email || user?.email,
        phone: profile?.phone || user?.phone,
        status: profile?.status || user?.status,
        user_id: farmerId,
      };
      const result = {
        farmer: farmerData,
        crops: crops || [], transactions: transactions || [], visits: visits || [], grainSales: grainSales || []
      };
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'deleteFarmer') {
      const { farmerId, adminId, adminName } = payload;
      const { error } = await supabase.rpc('delete_farmer', { p_farmer_id: farmerId, p_admin_id: adminId, p_admin_name: adminName });
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Farmer deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getManagers') {
      const { data, error } = await supabase.from('profiles').select('*, users!profiles_app_user_id_fkey(*, admin_profiles(*))').eq('role', 'manager').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map((p: any) => {
        const ap = p.users?.admin_profiles;
        return {
          id: p.app_user_id, name: p.name, email: p.email, phone: p.phone, status: p.status, created_at: p.created_at, department: ap?.department
        };
      });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateManagerStatus') {
      const { managerId, status, adminId } = payload;
      const { error } = await supabase.from('profiles').update({ status }).eq('app_user_id', managerId).eq('role', 'manager');
      if (error) throw error;

      // Keep legacy users table in sync
      await supabase.from('users').update({ status }).eq('id', managerId).eq('role', 'manager');

      await supabase.from('audit_logs').insert({
        user_id: adminId, action: status === 'active' ? 'Activate Manager' : 'Deactivate Manager', entity_type: 'manager', entity_id: managerId, details: `Manager status changed to ${status}`
      });
      return new Response(JSON.stringify({ message: 'Manager updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateManager') {
      const { managerId, managerData, adminId } = payload;
      const { name, email, phone, status } = managerData;
      const { error: profErr } = await supabase.from('profiles').update({
        name: name || undefined, email: email || undefined, phone: phone || undefined, status: status || undefined, updated_at: new Date()
      }).eq('app_user_id', managerId).eq('role', 'manager');
      if (profErr) throw profErr;

      await supabase.from('users').update({
        name: name || undefined, email: email || undefined, phone: phone || undefined, status: status || undefined, updated_at: new Date()
      }).eq('id', managerId).eq('role', 'manager');

      await supabase.from('audit_logs').insert({
        user_id: adminId, action: 'Edit Manager', entity_type: 'manager', entity_id: managerId, details: `Manager #${managerId} details updated`
      });
      return new Response(JSON.stringify({ message: 'Manager updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getAuditLogs') {
      // Get audit logs and enrich with profile data (source of truth for name/role)
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      
      // Batch-fetch profile data for all unique user_ids
      const userIds = [...new Set(data.map((al: any) => al.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('app_user_id, name, role').in('app_user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.app_user_id, p]));
      
      const result = data.map((al: any) => {
        const profile = profileMap.get(al.user_id);
        return { ...al, name: profile?.name, role: profile?.role };
      });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getReportsMonthly') {
      const { month } = payload;
      const { data: farmers, error } = await supabase.from('profiles').select('id, app_user_id, name, phone, users!profiles_app_user_id_fkey(crops(count), seed_purchases(count), transactions(amount))').eq('role', 'farmer').eq('status', 'active');
      if (error) throw error;
      
      const formattedFarmers = farmers.map((p: any) => {
        const u = p.users;
        const totalEarned = u?.transactions ? u.transactions.reduce((acc: number, t: any) => acc + (parseFloat(t.amount) || 0), 0) : 0;
        return {
          id: p.app_user_id, name: p.name, phone: p.phone, total_crops: u?.crops?.[0]?.count || 0, seed_purchases: u?.seed_purchases?.[0]?.count || 0, total_earned: totalEarned
        };
      });
      return new Response(JSON.stringify({ month, farmers: formattedFarmers }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Helper: get caller role from payload (passed by authenticated frontend).
    // The admin-api edge function is already protected by Supabase Auth at the
    // gateway level, and the frontend is behind authenticated routes. The
    // supabase.functions.invoke() JS client sends the anon key as the
    // Authorization header — NOT the user's JWT — so server-side
    // supabase.auth.getUser() always fails. Passing the role in the payload
    // matches the existing pattern used by deleteFarmer, updateManagerStatus, etc.
    function getCallerRole(): string | null {
      return payload?.callerRole ?? null;
    }

    // ===================== SEEDS INVENTORY =====================

    if (action === 'getSeeds') {
      const { data: seeds, error } = await supabase
        .from('seeds')
        .select('*, seed_warehouses(warehouse:warehouses(id, name, address))')
        .order('name');
      if (error) throw error;
      const result = seeds.map((s: any) => ({
        ...s,
        warehouses: s.seed_warehouses?.map((sw: any) => sw.warehouse).filter(Boolean) || [],
      }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getWarehouses') {
      const { data, error } = await supabase.from('warehouses').select('id, name, address').order('name');
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'createSeed') {
      const role = getCallerRole();
      if (role !== 'super_admin' && role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Only admins can add new seeds' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { name, variety, price_per_kg, stock_kg, description, image_url, is_active, warehouse_ids } = payload;
      if (!name || !price_per_kg || !stock_kg) {
        return new Response(JSON.stringify({ error: 'Name, price, and stock are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: seed, error } = await adminDb.from('seeds').insert({
        name, variety: variety || null, price_per_kg: parseFloat(price_per_kg), stock_kg: parseFloat(stock_kg),
        on_hold_kg: 0, description: description || null, image_url: image_url || null, is_active: !!is_active,
        warehouse_id: warehouse_ids?.[0] || null
      }).select('id').single();
      if (error) throw error;

      if (Array.isArray(warehouse_ids) && warehouse_ids.length > 0) {
        const rows = warehouse_ids.map((wid: number) => ({ seed_id: seed.id, warehouse_id: wid }));
        const { error: swErr } = await adminDb.from('seed_warehouses').insert(rows);
        if (swErr) throw swErr;
      }
      return new Response(JSON.stringify({ id: seed.id, message: 'Seed created' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateSeed') {
      const role = getCallerRole();
      const { seedId, name, variety, price_per_kg, stock_kg, description, image_url, is_active, warehouse_ids } = payload;
      if (!seedId) {
        return new Response(JSON.stringify({ error: 'seedId is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const updateFields: Record<string, any> = {
        name, variety: variety || null, stock_kg: parseFloat(stock_kg),
        description: description || null, image_url: image_url || null, is_active: !!is_active,
        warehouse_id: warehouse_ids?.[0] || null
      };
      // Managers cannot change price on existing seeds — mirrors the UI restriction.
      if (role === 'super_admin' || role === 'admin') {
        updateFields.price_per_kg = parseFloat(price_per_kg);
      }

      const { error } = await adminDb.from('seeds').update(updateFields).eq('id', seedId);
      if (error) throw error;

      if (Array.isArray(warehouse_ids)) {
        await adminDb.from('seed_warehouses').delete().eq('seed_id', seedId);
        if (warehouse_ids.length > 0) {
          const rows = warehouse_ids.map((wid: number) => ({ seed_id: seedId, warehouse_id: wid }));
          const { error: insErr } = await adminDb.from('seed_warehouses').insert(rows);
          if (insErr) throw insErr;
        }
      }
      return new Response(JSON.stringify({ message: 'Seed updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'deleteSeed') {
      const role = getCallerRole();
      if (role !== 'super_admin' && role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Only admins can delete seeds' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { seedId } = payload;
      if (!seedId) {
        return new Response(JSON.stringify({ error: 'seedId is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Delete warehouse mappings first
      await adminDb.from('seed_warehouses').delete().eq('seed_id', seedId);
      const { error } = await adminDb.from('seeds').delete().eq('id', seedId);
      if (error) {
        // FK violation — seed has existing purchases
        return new Response(JSON.stringify({ error: 'This seed cannot be deleted because it is referenced by existing purchases. Deactivate it instead.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ message: 'Seed deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===================== SEED PURCHASES =====================

    if (action === 'getSeedPurchases') {
      const { data, error } = await supabase
        .from('seed_purchases')
        .select('*, seed:seeds(name, variety)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const farmerIds = [...new Set(data.map((p: any) => p.farmer_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('app_user_id, name, phone').in('app_user_id', farmerIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.app_user_id, p]));

      const result = data.map((p: any) => {
        const farmer = profileMap.get(p.farmer_id);
        return {
          ...p,
          seed_name: p.seed?.name,
          seed_variety: p.seed?.variety,
          farmer_name: farmer?.name,
          farmer_phone: farmer?.phone,
        };
      });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateSeedPurchaseStatus') {
      const { purchaseId, status, adminId } = payload;
      if (!['paid', 'pending', 'failed'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: purchase, error } = await supabase.from('seed_purchases').update({ payment_status: status }).eq('id', purchaseId).select('farmer_id').single();
      if (error) throw error;

      if (adminId) {
        await supabase.from('audit_logs').insert({
          user_id: adminId, action: `Seed Purchase ${status === 'paid' ? 'Approved' : status === 'failed' ? 'Rejected' : 'Updated'}`,
          entity_type: 'seed_purchase', entity_id: purchaseId, details: `Payment status changed to ${status}`,
        });
      }
<<<<<<< HEAD
      // Notify the farmer of the approval/rejection outcome
      if (purchase?.farmer_id && (status === 'paid' || status === 'failed')) {
        await supabase.from('notifications').insert({
          user_id: purchase.farmer_id,
          title: status === 'paid' ? 'Seed Purchase Approved' : 'Seed Purchase Rejected',
          message: status === 'paid' ? 'Your seed purchase has been approved.' : 'Your seed purchase payment could not be confirmed. Please contact the warehouse.',
          type: status === 'paid' ? 'success' : 'error',
        });
      }
=======
>>>>>>> origin/main
      // Always sync notification read state for all users
      await supabase.from('notifications').update({ is_read: true }).eq('reference_type', 'seed_purchase').eq('reference_id', purchaseId);
      return new Response(JSON.stringify({ message: 'Purchase updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
