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

    const { action, payload } = await req.json();

    if (action === 'getProfile') {
      const { userId } = payload;
      const { data: user, error: userErr } = await supabase.from('profiles').select('*').eq('app_user_id', userId).single();
      if (userErr) throw userErr;
      const { data: profile, error: profErr } = await supabase.from('farmer_profiles').select('*').eq('user_id', userId).maybeSingle();
      if (profErr) throw profErr;
      return new Response(JSON.stringify({ user, profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateProfile') {
      const { userId, profileData } = payload;
      const { name, email, ...profileFields } = profileData;
      if (name || email) {
        const { error: userErr } = await supabase.from('profiles').update({ name: name || undefined, email: email || undefined, updated_at: new Date() }).eq('app_user_id', userId);
        if (userErr) throw userErr;

        // Sync to legacy users table
        await supabase.from('users').update({ name: name || undefined, email: email || undefined, updated_at: new Date() }).eq('id', userId);
      }
      const { error: profErr } = await supabase.from('farmer_profiles').update({ ...profileFields, updated_at: new Date() }).eq('user_id', userId);
      if (profErr) throw profErr;
      return new Response(JSON.stringify({ message: 'Profile updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'requestBankChange') {
      const { bankForm } = payload;
      const { data, error } = await supabase.from('bank_change_requests').insert({
        farmer_id: bankForm.farmer_id, bank_name: bankForm.bank_name, account_number: bankForm.account_number, ifsc_code: bankForm.ifsc_code, upi_id: bankForm.upi_id
      }).select('id').single();
      if (error) throw error;
      await supabase.from('farmer_profiles').update({ bank_status: 'pending' }).eq('user_id', bankForm.farmer_id);

      const { data: admins } = await supabase.from('users').select('id').in('role', ['admin', 'manager', 'super_admin']);
      if (admins && admins.length > 0) {
        // Get farmer name for the notification message
        const { data: farmerProfile } = await supabase.from('users').select('name').eq('id', bankForm.farmer_id).maybeSingle();
        const farmerName = farmerProfile?.name || 'A farmer';
        const notifications = admins.map((admin: any) => ({
          user_id: admin.id,
          title: 'Bank Change Request',
          message: `${farmerName} has requested to change their bank details.`,
          type: 'bank_change',
          reference_type: 'bank_request',
          reference_id: data.id
        }));
        await supabase.from('notifications').insert(notifications);
      }

      return new Response(JSON.stringify({ message: 'Bank change request submitted for admin approval', id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getDashboard') {
      const { farmerId } = payload;
      const { data, error } = await supabase.rpc('get_farmer_dashboard', { p_farmer_id: farmerId });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getCrops') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('crops').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'registerCrop') {
      const { farmerId, cropData } = payload;
      const { data, error } = await supabase.from('crops').insert({
        farmer_id: farmerId, crop_type: cropData.crop_type, acres: parseFloat(cropData.acres), sowing_date: cropData.sowing_date, notes: cropData.notes || null
      }).select('id').single();
      if (error) throw error;
      const visitMonths: Record<string, number[]> = { Rice:[1,3], Wheat:[1,3], Maize:[1,2], Cotton:[1,4], Groundnut:[1,3], Sugarcane:[2,5], Turmeric:[2,6], Chili:[1,3] };
      const months = visitMonths[cropData.crop_type] || [1, 3];
      return new Response(JSON.stringify({ id: data.id, message: `Crop registered. Farm visits scheduled for months ${months.join(' and ')}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getSeeds') {
      const { data: seeds, error } = await supabase.from('seeds').select(`*, seed_warehouses(warehouse:warehouses(id, name, address))`).eq('is_active', true).gt('stock_kg', 0).order('name');
      if (error) throw error;
      const result = seeds.map(s => ({ ...s, warehouses: s.seed_warehouses?.map((sw: any) => sw.warehouse).filter(Boolean) || [] }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'purchaseSeeds') {
      const { purchaseData } = payload;
      const { data, error } = await supabase.rpc('purchase_seeds', {
        p_farmer_id: purchaseData.farmer_id, p_seed_id: purchaseData.seed_id, p_quantity_kg: parseFloat(purchaseData.quantity_kg), p_payment_method: purchaseData.payment_method, p_upi_id: purchaseData.upi_id || null, p_transaction_id: purchaseData.transaction_id || null, p_warehouse_id: purchaseData.warehouse_id || null
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Generate seed purchase notifications for admin/manager
      const purchaseId = data?.purchase_id || data?.id;
      if (purchaseId) {
        const { data: farmer } = await supabase.from('users').select('name').eq('id', purchaseData.farmer_id).maybeSingle();
        const { data: seed } = await supabase.from('seeds').select('name').eq('id', purchaseData.seed_id).maybeSingle();
        const farmerName = farmer?.name || 'A farmer';
        const seedName = seed?.name || 'seeds';
        const qty = parseFloat(purchaseData.quantity_kg);
        const { data: admins } = await supabase.from('users').select('id').in('role', ['admin', 'manager', 'super_admin']);
        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'New Seed Purchase',
            message: `${farmerName} purchased ${qty} kg of ${seedName}. Payment: ${purchaseData.payment_method}.`,
            type: 'info',
            reference_type: 'seed_purchase',
            reference_id: purchaseId
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getSeedPurchases') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('seed_purchases').select('*, seed:seeds(name, variety)').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map(sp => ({ ...sp, seed_name: sp.seed?.name, seed_variety: sp.seed?.variety }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'submitGrainSale') {
      const { farmerId, saleData } = payload;
      const { grain_type, quantity_kg, warehouse_id } = saleData;
      const { data: sale, error: saleErr } = await supabase.from('grain_sales').insert({
        farmer_id: farmerId, grain_type, grade: 'A', raw_material_kg: parseFloat(quantity_kg), status: 'pending'
      }).select('id').single();
      if (saleErr) throw saleErr;
      const { error: slotErr } = await supabase.from('booking_slots').insert({
        farmer_id: farmerId, grain_sale_id: sale.id, booking_date: 'TBD', delivery_address: 'TBD', grain_type, warehouse_id, quantity_kg: parseFloat(quantity_kg), status: 'pending'
      });
      if (slotErr) throw slotErr;
      return new Response(JSON.stringify({ id: sale.id, estimated_amount: 0, message: 'Grain sale request submitted. Manager will assign a slot.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getGrainSales') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('grain_sales').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getWarehouses') {
      const { data: warehouses, error } = await supabase.from('warehouses').select('*, warehouse_inventory(*)').eq('is_active', true).order('name');
      if (error) throw error;
      const result = warehouses.map(w => ({ ...w, available_kg: parseFloat(w.total_capacity_kg) - parseFloat(w.current_load_kg), inventory: w.warehouse_inventory || [] }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getWarehouseSlots') {
      const { warehouseId, date } = payload;
      const { data, error } = await supabase.from('warehouse_slots').select('*').eq('warehouse_id', warehouseId).eq('slot_date', date).eq('status', 'active').order('start_time');
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'bookDeliverySlot') {
      const { farmerId, bookingData } = payload;
      const { grain_sale_id, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg } = bookingData;
      const { data, error } = await supabase.from('booking_slots').insert({
        farmer_id: farmerId, grain_sale_id: grain_sale_id || null, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg: parseFloat(quantity_kg), status: 'pending'
      }).select('id').single();
      if (error) throw error;

      // Notifications are created by the DB trigger (notify_on_booking_slot) which
      // fires on INSERT and already includes reference_type/reference_id for shared read state.

      return new Response(JSON.stringify({ id: data.id, message: 'Booking slot created. Awaiting confirmation.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getBookingSlots') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('booking_slots').select('*, warehouse:warehouses(name, address)').eq('farmer_id', farmerId).order('booking_date', { ascending: false });
      if (error) throw error;
      const result = data.map(bs => ({ ...bs, warehouse_name: bs.warehouse?.name, warehouse_address: bs.warehouse?.address }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getTransactions') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('transactions').select('*').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getVisits') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('farm_visits').select('*, crops(crop_type)').eq('farmer_id', farmerId).order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map(v => ({ ...v, crop_type: (v.crops as any)?.crop_type }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getNotifications') {
      const { farmerId } = payload;
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', farmerId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'markNotificationsRead') {
      const { farmerId } = payload;
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', farmerId);
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'All notifications marked as read' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'markNotificationRead') {
      const { farmerId, notifId } = payload;
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId).eq('user_id', farmerId);
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Notification marked as read' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getMarketRates') {
      const { data, error } = await supabase.from('market_rates').select('*').order('crop_type').order('grade');
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
