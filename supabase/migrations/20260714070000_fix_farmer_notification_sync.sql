-- Drop the trigger if it exists and recreate the function for farmer registration notifications to use app_user_id (integer) instead of auth_user_id (UUID)
-- This ensures reference_id matches the farmerId (app_user_id) passed during approvals

CREATE OR REPLACE FUNCTION public.notify_on_farmer_registration()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mgr RECORD;
BEGIN
  IF NEW.role = 'farmer' AND NEW.status = 'pending' THEN
    FOR v_mgr IN SELECT id FROM public.users WHERE role IN ('manager', 'super_admin') AND status = 'active' LOOP
      INSERT INTO public.notifications (user_id, title, message, type, reference_type, reference_id)
      VALUES (v_mgr.id, 'New Farmer Registration', NEW.name || ' (' || NEW.phone || ') has requested registration.', 'info', 'farmer', NEW.app_user_id::text);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
