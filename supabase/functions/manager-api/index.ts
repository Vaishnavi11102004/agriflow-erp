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

    if (action === 'approveFarmer') {
      const { farmerId, status, notes, adminId } = payload;
      const { error } = await supabase.rpc('approve_farmer', { p_farmer_id: farmerId, p_status: status, p_notes: notes || null, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Farmer status updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getBankRequests') {
      // Join profiles for farmer name/phone (profiles is source of truth for user metadata)
      const { data, error } = await supabase.from('bank_change_requests').select('*').eq('status', 'pending').order('requested_at', { ascending: false });
      if (error) throw error;

      // Enrich with profile data for each farmer
      const result = await Promise.all(data.map(async (bcr: any) => {
        const { data: profile } = await supabase.from('profiles').select('name, phone').eq('app_user_id', bcr.farmer_id).maybeSingle();
        return { ...bcr, farmer_name: profile?.name, phone: profile?.phone };
      }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reviewBankRequest') {
      const { requestId, status, notes, adminId } = payload;
      const { error } = await supabase.rpc('review_bank_request', { p_request_id: requestId, p_status: status, p_notes: notes || null, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: `Bank request ${status}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getVisits') {
      const { adminId, role } = payload;
      let query = supabase.from('farm_visits').select(`*, farmer:users!farm_visits_farmer_id_fkey(name, phone), manager:users!farm_visits_admin_id_fkey(name, phone), crop:crops(crop_type, sowing_date, notes), farmer_profile:farmer_profiles!farm_visits_farmer_id_fkey(crop_address)`);
      if (role === 'manager') query = query.eq('admin_id', adminId);
      const { data, error } = await query.order('scheduled_date', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map((fv: any) => ({
        ...fv, farmer_name: fv.farmer?.name, farmer_phone: fv.farmer?.phone, manager_name: fv.manager?.name, manager_phone: fv.manager?.phone, crop_type: fv.crop?.crop_type, sowing_date: fv.crop?.sowing_date, description: fv.crop?.notes, crop_address: fv.farmer_profile?.crop_address
      }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getActiveCrops') {
      const { data, error } = await supabase.from('crops').select('*, farmer:users(name, phone)').eq('status', 'growing').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map((c: any) => ({
        crop_id: c.id, crop_type: c.crop_type, acres: c.acres, sowing_date: c.sowing_date, farmer_id: c.farmer_id, farmer_name: c.farmer?.name, farmer_phone: c.farmer?.phone
      }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'scheduleVisit') {
      const { visitData, adminId, adminRole } = payload;
      const { crop_id, farmer_id, visit_month, scheduled_date, admin_id } = visitData;
      const effectiveAdminId = admin_id || (adminRole === 'manager' ? adminId : null);
      const { data, error } = await supabase.from('farm_visits').insert({
        crop_id, farmer_id, admin_id: effectiveAdminId, visit_month: parseInt(visit_month), scheduled_date, status: 'scheduled'
      }).select('id').single();
      if (error) throw error;
      
      await supabase.from('notifications').insert({ user_id: farmer_id, title: 'Farm Visit Scheduled', message: `A visit has been scheduled for ${scheduled_date} (Month ${visit_month}).`, type: 'info' });
      if (effectiveAdminId && effectiveAdminId !== adminId) {
        await supabase.from('notifications').insert({ user_id: effectiveAdminId, title: 'Farm Visit Assigned', message: `You have been assigned a farm visit for farmer #${farmer_id} on ${scheduled_date}.`, type: 'info' });
      }
      await supabase.from('audit_logs').insert({ user_id: adminId, action: 'Schedule Farm Visit', entity_type: 'farm_visit', entity_id: data.id, details: `Scheduled visit for farmer ${farmer_id} on ${scheduled_date}` });
      return new Response(JSON.stringify({ id: data.id, message: 'Visit scheduled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateVisit') {
      const { visitId, visitData, adminId } = payload;
      const { status, actual_date, verified_acres, report, scheduled_date, admin_id } = visitData;
      const { error } = await supabase.from('farm_visits').update({
        status: status || undefined, actual_date: actual_date || undefined, verified_acres: verified_acres ? parseFloat(verified_acres) : undefined, report: report || undefined, scheduled_date: scheduled_date || undefined, admin_id: admin_id || undefined
      }).eq('id', visitId);
      if (error) throw error;
      
      if (admin_id) {
        await supabase.from('notifications').insert({ user_id: admin_id, title: 'Farm Visit Assigned', message: `You have been assigned to Farm Visit #${visitId}.`, type: 'info' });
      }
      await supabase.from('audit_logs').insert({ user_id: adminId, action: status ? `Update Farm Visit (${status})` : 'Update Farm Visit', entity_type: 'farm_visit', entity_id: visitId, details: `Updated visit fields` });
      return new Response(JSON.stringify({ message: 'Visit updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'triggerVisitNotifications') {
      // Simplified: the real implementation had a 2-day target loop. 
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      const targetDateString = targetDate.toISOString().split('T')[0];
      const { data: visits } = await supabase.from('farm_visits').select('*').eq('status', 'scheduled').eq('scheduled_date', targetDateString);
      let count = 0;
      for (const visit of (visits || [])) {
        const { data: existing } = await supabase.from('notifications').select('id').eq('reference_type', 'farm_visit').eq('reference_id', visit.id).maybeSingle();
        if (!existing) {
          await supabase.from('notifications').insert({ user_id: visit.farmer_id, title: 'Upcoming Farm Visit', message: `Reminder: Your farm visit is scheduled for ${visit.scheduled_date}. Please be available at the farm.`, type: 'info', reference_type: 'farm_visit', reference_id: visit.id });
          count++;
        }
      }
      return new Response(JSON.stringify({ message: `Triggered ${count} notifications for visits on ${targetDateString}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getBookingSlots') {
      const { data, error } = await supabase.from('booking_slots').select(`*, farmer:users!booking_slots_farmer_id_fkey(name, phone), warehouse:warehouses(name), inspections:crop_inspections(id, good_quantity_kg, bad_quantity_kg, rejection_reason, notes, created_at, inspector:users(name)), grain_sale:grain_sales(good_material_kg, wastage_kg)`).order('booking_date', { ascending: false });
      if (error) throw error;
      const result = data.map((bs: any) => {
        const inspection = bs.inspections?.[0];
        return {
          ...bs, farmer_name: bs.farmer?.name, phone: bs.farmer?.phone, warehouse_name: bs.warehouse?.name, inspection_id: inspection?.id, good_quantity_kg: bs.grain_sale?.good_material_kg || inspection?.good_quantity_kg, bad_quantity_kg: bs.grain_sale?.wastage_kg || inspection?.bad_quantity_kg, rejection_reason: inspection?.rejection_reason, inspection_notes: inspection?.notes, inspection_date: inspection?.created_at, inspector_name: inspection?.inspector?.name
        };
      });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'editYield') {
      const { slotId, goodQty, badQty, adminName, adminId } = payload;
      const { error } = await supabase.rpc('update_booking_yield', { p_slot_id: slotId, p_good_qty: parseFloat(goodQty), p_bad_qty: parseFloat(badQty), p_admin_name: adminName, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Yield updated successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'updateBookingStatus') {
      const { slotId, status, warehouseSlotId, adminName, adminId } = payload;
      const { error } = await supabase.rpc('update_booking_status', { p_slot_id: slotId, p_status: status, p_warehouse_slot_id: warehouseSlotId ? parseInt(warehouseSlotId) : null, p_admin_name: adminName, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: `Slot ${status}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'inspectCrop') {
      const { slotId, goodQty, badQty, rejectionReason, notes, inspectorId, inspectorName } = payload;
      const { data, error } = await supabase.rpc('inspect_crop', { p_slot_id: slotId, p_good_qty: parseFloat(goodQty), p_bad_qty: parseFloat(badQty), p_rejection_reason: rejectionReason || null, p_notes: notes || null, p_inspector_id: inspectorId, p_inspector_name: inspectorName });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'getGrainSales') {
      const { data, error } = await supabase.from('grain_sales').select('*, farmer:users(name, phone), farmer_profile:farmer_profiles!grain_sales_farmer_id_fkey(bank_name, account_number, ifsc_code, upi_id)').order('created_at', { ascending: false });
      if (error) throw error;
      const result = data.map((gs: any) => ({ ...gs, farmer_name: gs.farmer?.name, farmer_phone: gs.farmer?.phone, bank_name: gs.farmer_profile?.bank_name, account_number: gs.farmer_profile?.account_number, ifsc_code: gs.farmer_profile?.ifsc_code, upi_id: gs.farmer_profile?.upi_id }));
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'procureCrop') {
      const { procData, adminId } = payload;
      const { data, error } = await supabase.rpc('procure_crop', { p_farmer_id: procData.farmer_id, p_grain_type: procData.grain_type, p_grade: procData.grade, p_raw_qty: parseFloat(procData.raw_material_kg), p_good_qty: parseFloat(procData.good_material_kg), p_wastage_qty: parseFloat(procData.wastage_kg), p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Crop procured successfully', id: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reviewGrainSale') {
      const { saleId, status, finalAmount, adminId } = payload;
      const { error } = await supabase.rpc('review_grain_sale', { p_sale_id: saleId, p_status: status, p_final_amount: finalAmount ? parseFloat(finalAmount) : null, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: `Sale ${status}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'payGrainSale') {
      const { saleId, description, adminId } = payload;
      const { error } = await supabase.rpc('pay_grain_sale', { p_sale_id: saleId, p_description: description || null, p_admin_id: adminId });
      if (error) throw error;
      return new Response(JSON.stringify({ message: 'Farmer paid successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
