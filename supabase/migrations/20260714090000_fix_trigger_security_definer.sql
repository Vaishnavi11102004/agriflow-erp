-- Root cause: notify_on_booking_slot() and notify_on_bank_request() were the only
-- two notification triggers NOT marked SECURITY DEFINER (every sibling function --
-- notify_on_farmer_registration, purchase_seeds, approve_farmer, etc. -- already is).
--
-- Both triggers fire on a table insert made by the FARMER themselves (booking_slots,
-- bank_change_requests) through the RLS-scoped client. Without SECURITY DEFINER, the
-- trigger body runs under the farmer's own RLS context, and `users_policy` only lets
-- a farmer see their own row. So `SELECT id FROM users WHERE role IN (...)` inside
-- the trigger silently returns zero rows -- no exception, no error, just zero
-- notifications ever created for Manager/Super Admin. Confirmed live: a real
-- farmer-initiated booking created the booking_slots row successfully but produced
-- no notification at all.
--
-- Adding SECURITY DEFINER (matching every other notification-producing function in
-- this schema) lets the trigger read the full users table and insert notifications
-- for other users, exactly like notify_on_farmer_registration already does.

CREATE OR REPLACE FUNCTION public.notify_on_booking_slot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mgr RECORD;
  v_name TEXT;
  v_qty_qtl numeric;
BEGIN
  SELECT name INTO v_name FROM users WHERE id = NEW.farmer_id;
  v_qty_qtl := ROUND(NEW.quantity_kg / 100.0, 1);
  FOR v_mgr IN SELECT id FROM users WHERE role IN ('manager', 'super_admin') AND status = 'active' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_mgr.id, 'New Delivery Slot Booking', v_name || ' booked a delivery for ' || v_qty_qtl || ' Qtl of ' || NEW.grain_type || ' on ' || NEW.booking_date || '.', 'info', 'booking_slot', NEW.id);
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_bank_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin RECORD;
  v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM users WHERE id = NEW.farmer_id;
  FOR v_admin IN SELECT id FROM users WHERE role = 'super_admin' AND status = 'active' LOOP
    INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (v_admin.id, 'Bank Detail Change', v_name || ' has requested bank detail changes.', 'warning', 'bank_request', NEW.id);
  END LOOP;
  RETURN NEW;
END;
$function$;
