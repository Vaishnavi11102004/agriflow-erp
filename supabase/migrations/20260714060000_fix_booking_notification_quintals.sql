-- Fix the database trigger that generates "New Delivery Slot Booking" notifications
-- with quantity in kg. Replace it to show Quintals instead.
-- Also ensure all booking_slot notifications include reference_type and reference_id
-- so the shared read state works (when one admin/manager approves, all others see it as read).

-- First, drop the old trigger if it exists
DROP TRIGGER IF EXISTS notify_on_booking_slot ON public.booking_slots;
DROP FUNCTION IF EXISTS public.notify_on_booking_slot();

-- Recreate the function with Quintals instead of kg
CREATE OR REPLACE FUNCTION public.notify_on_booking_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_farmer_name text;
  v_mgr RECORD;
  v_qty_qtl numeric;
BEGIN
  -- Get farmer name
  SELECT name INTO v_farmer_name FROM public.users WHERE id = NEW.farmer_id;

  -- Convert kg to quintals (1 quintal = 100 kg)
  v_qty_qtl := ROUND(NEW.quantity_kg / 100.0, 1);

  -- Notify all managers and admins
  FOR v_mgr IN SELECT id FROM public.users WHERE role IN ('manager', 'admin', 'super_admin') AND status = 'active' LOOP
    INSERT INTO public.notifications (user_id, title, message, type, reference_type, reference_id)
    VALUES (
      v_mgr.id,
      'New Delivery Slot Booking',
      COALESCE(v_farmer_name, 'A farmer') || ' booked a delivery for ' || v_qty_qtl || ' Qtl of ' || COALESCE(NEW.grain_type, 'grain') || ' on ' || NEW.booking_date || '.',
      'info',
      'booking_slot',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER notify_on_booking_slot
  AFTER INSERT ON public.booking_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_booking_slot();
