-- Fix the database trigger function that generates "New Delivery Slot Booking"
-- notifications with quantity in kg. Replace it to show Quintals instead.
--
-- Note: the live trigger binding to this function is named booking_slots_after_insert
-- (AFTER INSERT ON booking_slots), not notify_on_booking_slot -- CREATE OR REPLACE
-- FUNCTION updates its body in place without touching that trigger, so we don't
-- drop/recreate anything here (doing so previously left two triggers calling this
-- function and double-inserted the notification on every booking). Everything
-- else (signature, security context, reference_type/reference_id) is unchanged
-- from the live definition; only the Kg -> Qtl conversion in the message is new.

CREATE OR REPLACE FUNCTION public.notify_on_booking_slot()
 RETURNS trigger
 LANGUAGE plpgsql
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
