-- Fixes for the notification workflow spec:
-- 1) purchase_seeds: notify Manager + Super Admin on EVERY seed purchase (not just
--    "pay at warehouse"), in Quintals, with farmer/seed/warehouse/amount/payment info.
--    The farmer-api edge function used to also insert its own admin/manager
--    notification after calling this RPC, which duplicated the "pay at warehouse"
--    case and left immediate-payment purchases unlabeled in Kg-only text; that
--    duplicate insert is removed in the edge function in this same change set.
-- 2) inspect_crop / update_booking_yield / procure_crop / update_booking_status:
--    convert Kg quantities embedded in notification/audit-log message text to
--    Quintals so nothing displaying these strings in the UI shows raw Kg.

CREATE OR REPLACE FUNCTION public.purchase_seeds(p_farmer_id bigint, p_seed_id bigint, p_quantity_kg numeric, p_payment_method text, p_upi_id text, p_transaction_id text, p_warehouse_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_seed RECORD;
  v_effective_warehouse_id bigint;
  v_warehouse_name TEXT := 'the warehouse';
  v_total numeric;
  v_invoice TEXT;
  v_purchase_id bigint;
  v_is_warehouse boolean;
  v_payment_status TEXT;
  v_farmer_name TEXT;
  v_mgr RECORD;
  v_notif_msg TEXT;
BEGIN
  SELECT * INTO v_seed FROM seeds WHERE id = p_seed_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Seed not found or inactive');
  END IF;

  IF v_seed.stock_kg < p_quantity_kg THEN
    RETURN json_build_object('error', 'Insufficient stock. Available: ' || round(v_seed.stock_kg / 100.0, 2) || ' Qtl');
  END IF;

  v_effective_warehouse_id := COALESCE(v_seed.warehouse_id, p_warehouse_id);
  IF v_effective_warehouse_id IS NOT NULL THEN
    SELECT name INTO v_warehouse_name FROM warehouses WHERE id = v_effective_warehouse_id;
  END IF;

  v_total := v_seed.price_per_kg * p_quantity_kg;
  v_invoice := 'INV-' || extract(epoch from now())::bigint;
  v_is_warehouse := (p_payment_method = 'warehouse');
  v_payment_status := CASE WHEN v_is_warehouse THEN 'pending' ELSE 'paid' END;

  INSERT INTO seed_purchases
    (farmer_id, seed_id, quantity_kg, price_per_kg, total_amount, upi_id, transaction_id, payment_status, invoice_number)
  VALUES (p_farmer_id, p_seed_id, p_quantity_kg, v_seed.price_per_kg, v_total,
          CASE WHEN v_is_warehouse THEN NULL ELSE p_upi_id END,
          CASE WHEN v_is_warehouse THEN NULL ELSE p_transaction_id END,
          v_payment_status, v_invoice)
  RETURNING id INTO v_purchase_id;

  UPDATE seeds
  SET stock_kg = stock_kg - p_quantity_kg,
      on_hold_kg = COALESCE(on_hold_kg, 0) + p_quantity_kg,
      updated_at = now()
  WHERE id = p_seed_id;

  SELECT name INTO v_farmer_name FROM users WHERE id = p_farmer_id;

  IF NOT v_is_warehouse THEN
    INSERT INTO transactions
      (reference_type, reference_id, farmer_id, amount, upi_id, transaction_id, direction, status, description, invoice_number)
    VALUES ('seed_purchase', v_purchase_id, p_farmer_id, v_total, p_upi_id, p_transaction_id, 'debit', 'completed',
            'Seed purchase: ' || v_seed.name || ' ' || round(p_quantity_kg / 100.0, 2) || ' Qtl', v_invoice);
  END IF;

  v_notif_msg := COALESCE(v_farmer_name, 'A farmer') || ' purchased ' || round(p_quantity_kg / 100.0, 2) || ' Qtl of ' || v_seed.name ||
                 ' at ' || v_warehouse_name || '. Total: Rs.' || round(v_total, 2) ||
                 '. Payment: ' || CASE WHEN v_is_warehouse THEN 'Pay at Warehouse (Pending)' ELSE initcap(p_payment_method) || ' (Paid)' END || '.';

  FOR v_mgr IN SELECT id FROM users WHERE role IN ('manager', 'super_admin') AND status = 'active' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_mgr.id, 'New Seed Purchase', v_notif_msg, 'info', 'seed_purchase', v_purchase_id);
  END LOOP;

  RETURN json_build_object(
    'id', v_purchase_id,
    'invoice_number', v_invoice,
    'total_amount', v_total,
    'message', 'Purchase successful'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.inspect_crop(p_slot_id bigint, p_good_qty numeric, p_bad_qty numeric, p_rejection_reason text, p_notes text, p_inspector_id bigint, p_inspector_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_slot RECORD;
  v_sum numeric;
  v_total_qty numeric;
  v_rate numeric := 0;
  v_total_amount numeric := 0;
  v_farmer_name TEXT;
  v_warehouse_name TEXT;
  v_admin RECORD;
  v_inspection_date TEXT;
  v_notif_msg TEXT;
BEGIN
  SELECT * INTO v_slot FROM booking_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Slot not found');
  END IF;

  IF v_slot.status <> 'delivered' THEN
    RETURN json_build_object('error', 'Inspection is only allowed for slots with status ''delivered''');
  END IF;

  v_total_qty := v_slot.quantity_kg;
  v_sum := round(p_good_qty + p_bad_qty, 4);
  IF abs(v_sum - v_total_qty) > 0.01 THEN
    RETURN json_build_object('error', 'Good (' || round(p_good_qty / 100.0, 1) || ' Qtl) + Bad (' || round(p_bad_qty / 100.0, 1) || ' Qtl) = ' || round(v_sum / 100.0, 1) || ' Qtl does not match total quantity (' || round(v_total_qty / 100.0, 1) || ' Qtl)');
  END IF;

  IF EXISTS (SELECT 1 FROM crop_inspections WHERE booking_slot_id = p_slot_id) THEN
    RETURN json_build_object('error', 'This slot has already been inspected');
  END IF;

  INSERT INTO crop_inspections (booking_slot_id, grain_sale_id, inspector_id, good_quantity_kg, bad_quantity_kg, rejection_reason, notes)
  VALUES (p_slot_id, v_slot.grain_sale_id, p_inspector_id, p_good_qty, p_bad_qty, p_rejection_reason, p_notes);

  UPDATE booking_slots SET status = 'Inspection Completed' WHERE id = p_slot_id;

  IF v_slot.grain_sale_id IS NOT NULL THEN
    SELECT price_per_kg INTO v_rate FROM market_rates
    WHERE crop_type = v_slot.grain_type AND grade = 'A'
    ORDER BY effective_date DESC, created_at DESC LIMIT 1;

    v_total_amount := p_good_qty * COALESCE(v_rate, 0);

    UPDATE grain_sales
    SET raw_material_kg = v_total_qty,
        wastage_kg = p_bad_qty,
        good_material_kg = p_good_qty,
        price_per_kg = COALESCE(v_rate, 0),
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = v_slot.grain_sale_id;
  END IF;

  SELECT name INTO v_farmer_name FROM users WHERE id = v_slot.farmer_id;
  SELECT name INTO v_warehouse_name FROM warehouses WHERE id = v_slot.warehouse_id;
  v_inspection_date := to_char(now(), 'DD/MM/YYYY');

  v_notif_msg := 'Inspection completed for ' || v_farmer_name || '''s ' || v_slot.grain_type || ' (' || round(v_total_qty / 100.0, 1) || ' Qtl) at ' || v_warehouse_name || '. ' ||
                 'Good: ' || round(p_good_qty / 100.0, 1) || ' Qtl | Rejected: ' || round(p_bad_qty / 100.0, 1) || ' Qtl' || CASE WHEN p_rejection_reason IS NOT NULL THEN ' (' || p_rejection_reason || ')' ELSE '' END || '. ' ||
                 'Inspected by ' || p_inspector_name || ' on ' || v_inspection_date || '.';

  FOR v_admin IN SELECT id FROM users WHERE role = 'super_admin' AND status = 'active' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_admin.id, 'Crop Inspection Completed', v_notif_msg, 'info', 'booking_slot', p_slot_id);
  END LOOP;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_inspector_id, 'Crop Inspection', 'booking_slot', p_slot_id,
          'Inspected ' || v_slot.grain_type || ': ' || round(v_total_qty / 100.0, 1) || ' Qtl total -- Good: ' || round(p_good_qty / 100.0, 1) || ' Qtl, Rejected: ' || round(p_bad_qty / 100.0, 1) || ' Qtl');

  RETURN json_build_object(
    'good_quantity_kg', p_good_qty,
    'bad_quantity_kg', p_bad_qty,
    'message', 'Inspection saved successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_booking_yield(p_slot_id bigint, p_good_qty numeric, p_bad_qty numeric, p_admin_name text, p_admin_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_slot RECORD;
  v_rate numeric := 0;
  v_total numeric := 0;
  v_admin RECORD;
BEGIN
  SELECT * INTO v_slot FROM booking_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  IF v_slot.grain_sale_id IS NULL THEN
    RAISE EXCEPTION 'No grain sale linked to this booking slot';
  END IF;

  SELECT price_per_kg INTO v_rate FROM market_rates
  WHERE crop_type = v_slot.grain_type AND grade = 'A'
  ORDER BY effective_date DESC, created_at DESC LIMIT 1;

  v_total := p_good_qty * COALESCE(v_rate, 0);

  UPDATE grain_sales
  SET wastage_kg = p_bad_qty,
      good_material_kg = p_good_qty,
      price_per_kg = COALESCE(v_rate, 0),
      total_amount = v_total,
      status = 'received',
      updated_at = now()
  WHERE id = v_slot.grain_sale_id;

  FOR v_admin IN SELECT id FROM users WHERE role = 'super_admin' AND status = 'active' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_admin.id, 'Procurement Yield Updated',
            'Yield updated for Booking #' || p_slot_id || ' (Sale #' || v_slot.grain_sale_id || '). Good: ' || round(p_good_qty / 100.0, 1) || ' Qtl, Waste: ' || round(p_bad_qty / 100.0, 1) || ' Qtl. Updated by ' || p_admin_name || '.',
            'info', 'grain_sale', v_slot.grain_sale_id);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.procure_crop(p_farmer_id bigint, p_grain_type text, p_grade text, p_raw_qty numeric, p_good_qty numeric, p_wastage_qty numeric, p_admin_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_rate numeric := 0;
  v_total numeric := 0;
  v_sale_id bigint;
  v_admin RECORD;
BEGIN
  SELECT price_per_kg INTO v_rate FROM market_rates
  WHERE crop_type = p_grain_type AND grade = p_grade
  ORDER BY effective_date DESC, created_at DESC LIMIT 1;

  v_total := p_good_qty * COALESCE(v_rate, 0);

  INSERT INTO grain_sales (farmer_id, grain_type, grade, raw_material_kg, good_material_kg, wastage_kg, price_per_kg, total_amount, status)
  VALUES (p_farmer_id, p_grain_type, p_grade, p_raw_qty, p_good_qty, p_wastage_qty, COALESCE(v_rate, 0), v_total, 'received')
  RETURNING id INTO v_sale_id;

  FOR v_admin IN SELECT id FROM users WHERE role = 'super_admin' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_admin.id, 'Crop Procured', 'New crop procured (' || p_grain_type || ', ' || round(p_good_qty / 100.0, 1) || ' Qtl). Ready for payment.', 'info', 'grain_sale', v_sale_id);
  END LOOP;

  RETURN v_sale_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_booking_status(p_slot_id bigint, p_status text, p_warehouse_slot_id bigint, p_admin_name text, p_admin_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_slot RECORD;
  v_wslot RECORD;
  v_available numeric;
  v_rate numeric := 0;
  v_raw numeric;
  v_wastage numeric;
  v_good numeric;
  v_total numeric;
  v_admin RECORD;
  v_status_label TEXT;
  v_success boolean;
  v_notif_type TEXT;
BEGIN
  SELECT * INTO v_slot FROM booking_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  IF p_status = 'confirmed' THEN
    IF p_warehouse_slot_id IS NULL THEN
      RAISE EXCEPTION 'Warehouse time slot is required to confirm booking';
    END IF;

    SELECT * INTO v_wslot FROM warehouse_slots WHERE id = p_warehouse_slot_id AND status = 'active' AND warehouse_id = v_slot.warehouse_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected time slot not found, inactive, or invalid';
    END IF;

    v_available := v_wslot.total_capacity_kg - v_wslot.booked_capacity_kg;
    IF v_slot.quantity_kg > v_available THEN
      RAISE EXCEPTION 'Insufficient capacity in this time slot';
    END If;

    UPDATE warehouse_slots SET booked_capacity_kg = booked_capacity_kg + v_slot.quantity_kg WHERE id = p_warehouse_slot_id;
    UPDATE booking_slots SET warehouse_slot_id = p_warehouse_slot_id WHERE id = p_slot_id;

    INSERT INTO warehouse_inventory (warehouse_id, grain_type, quantity_kg)
    VALUES (v_slot.warehouse_id, v_slot.grain_type, v_slot.quantity_kg)
    ON CONFLICT (warehouse_id, grain_type)
    DO UPDATE SET quantity_kg = warehouse_inventory.quantity_kg + v_slot.quantity_kg, last_updated = now();

    UPDATE warehouses SET current_load_kg = current_load_kg + v_slot.quantity_kg WHERE id = v_slot.warehouse_id;
  END IF;

  UPDATE booking_slots SET status = p_status WHERE id = p_slot_id;

  IF p_status = 'completed' AND v_slot.grain_sale_id IS NOT NULL THEN
    SELECT price_per_kg INTO v_rate FROM market_rates
    WHERE crop_type = v_slot.grain_type AND grade = 'A'
    ORDER BY effective_date DESC, created_at DESC LIMIT 1;

    v_raw := v_slot.quantity_kg;
    v_wastage := v_raw * 0.05;
    v_good := v_raw - v_wastage;
    v_total := v_good * COALESCE(v_rate, 0);

    UPDATE grain_sales
    SET wastage_kg = v_wastage,
        good_material_kg = v_good,
        price_per_kg = COALESCE(v_rate, 0),
        total_amount = v_total,
        status = 'received',
        updated_at = now()
    WHERE id = v_slot.grain_sale_id;

    FOR v_admin IN SELECT id FROM users WHERE role = 'super_admin' LOOP
      INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
      VALUES (v_admin.id, 'Crop Received', 'Crop for Sale #' || v_slot.grain_sale_id || ' has been received. Ready for payment.', 'info', 'grain_sale', v_slot.grain_sale_id);
    END LOOP;
  END IF;

  v_status_label := CASE WHEN p_status = 'delivered' THEN 'Delivered to Warehouse' ELSE p_status END;
  v_success := (p_status IN ('confirmed', 'completed', 'delivered'));
  v_notif_type := CASE WHEN v_success THEN 'success' WHEN p_status = 'cancelled' THEN 'error' ELSE 'warning' END;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_slot.farmer_id, 'Booking Slot ' || v_status_label, 'Your delivery slot on ' || v_slot.booking_date || ' has been marked as ' || v_status_label || '.', v_notif_type);

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, CASE WHEN p_status = 'confirmed' THEN 'Confirm Slot' WHEN p_status = 'completed' THEN 'Complete Slot' WHEN p_status = 'delivered' THEN 'Mark Delivered' ELSE 'Cancel/Reject Slot' END,
          'booking_slot', p_slot_id, p_admin_name || ' marked slot status as ' || p_status || ' for ' || round(v_slot.quantity_kg / 100.0, 1) || ' Qtl of ' || v_slot.grain_type);

  UPDATE notifications SET is_read = TRUE WHERE reference_type = 'booking_slot' AND reference_id = p_slot_id;
END;
$function$;
