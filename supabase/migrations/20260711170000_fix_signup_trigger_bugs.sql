-- Fixes two bugs that made every signup (public registration via auth.signUp()
-- and admin.createUser()) fail with GoTrue's generic "Database error saving new
-- user" (500), traced by temporarily instrumenting handle_new_user() with error
-- logging and reproducing the exact trigger chain directly against Postgres.

-- Bug A: notify_on_farmer_registration() referenced "users"/"notifications"
-- unqualified and was not SECURITY DEFINER. When it fires as a nested trigger
-- during signup (invoked in the context of supabase_auth_admin's session, whose
-- search_path resolves bare "users" to auth.users before public.users), the
-- unqualified reference resolved to auth.users — which has no "status" column —
-- raising "column \"status\" does not exist" and aborting the whole signup
-- transaction. Schema-qualifying the references (and adding SECURITY DEFINER so
-- it always runs with a fixed, predictable context) fixes this permanently.
CREATE OR REPLACE FUNCTION public.notify_on_farmer_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mgr RECORD;
BEGIN
  IF NEW.role = 'farmer' AND NEW.status = 'pending' THEN
    FOR v_mgr IN SELECT id FROM public.users WHERE role IN ('manager', 'super_admin') AND status = 'active' LOOP
      INSERT INTO public.notifications (user_id, title, message, type, reference_type, reference_id)
      VALUES (v_mgr.id, 'New Farmer Registration', NEW.name || ' (' || NEW.phone || ') has requested registration.', 'info', 'farmer', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Bug B (uncovered once Bug A was fixed): public.users.phone is NOT NULL and
-- UNIQUE. Self-registration (auth.signUp()) never includes a phone number —
-- it's collected separately and attached later via the auth-api
-- registerDatabaseUser action — so handle_new_user() defaulted phone to ''.
-- The first phone-less signup succeeded, but every subsequent one collided on
-- the UNIQUE constraint with error "duplicate key value violates unique
-- constraint \"users_phone_key\", Key (phone)=() already exists." NULL isn't a
-- valid fallback (NOT NULL), so use a placeholder that's unique per auth user
-- (their own id) instead; it gets overwritten with the real phone number
-- moments later by registerDatabaseUser / admin-create-user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
  DECLARE
    v_app_user_id integer;
    v_phone text;
  BEGIN
    v_phone := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), '');
    v_phone := COALESCE(v_phone, 'pending-' || NEW.id::text);

    INSERT INTO public.users (name, email, phone, role, status, first_login, uuid, password_hash)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
      NEW.email,
      v_phone,
      COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
      COALESCE(NEW.raw_user_meta_data->>'status', CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') = 'farmer' THEN 'pending' ELSE 'active' END),
      COALESCE((NEW.raw_user_meta_data->>'first_login')::boolean, (COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') = 'manager')),
      NEW.id,
      ''
    )
    ON CONFLICT (uuid) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        first_login = EXCLUDED.first_login
    RETURNING id INTO v_app_user_id;

    IF v_app_user_id IS NULL THEN
      SELECT id INTO v_app_user_id FROM public.users WHERE uuid = NEW.id;
    END IF;

    INSERT INTO public.profiles (id, auth_user_id, app_user_id, name, role, status, phone, email, created_at, updated_at, address, first_login)
    VALUES (
      NEW.id,
      NEW.id,
      v_app_user_id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
      COALESCE(NEW.raw_user_meta_data->>'status', CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') = 'farmer' THEN 'pending' ELSE 'active' END),
      v_phone,
      NEW.email,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      COALESCE((NEW.raw_user_meta_data->>'first_login')::boolean, (COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') = 'manager'))
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        address = COALESCE(EXCLUDED.address, public.profiles.address),
        first_login = EXCLUDED.first_login,
        updated_at = now();

    RETURN NEW;
  END;
  $function$;
