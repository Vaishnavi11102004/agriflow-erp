-- Fix infinite RLS recursion: nearly every policy resolved the caller's role via a
-- subquery against `users` (e.g. "SELECT role FROM users WHERE uuid = auth.uid()"),
-- and `users` itself has a policy that runs the same kind of subquery against itself.
-- Evaluating that subquery re-triggers RLS on `users`, which re-evaluates the same
-- policy, which re-triggers RLS again — Postgres detects this and errors with
-- "infinite recursion detected in policy for relation users". Because so many
-- policies embed that subquery, this 500'd nearly every read from the anon/
-- authenticated client project-wide (dashboards, market rates, seeds, warehouses,
-- farmer data — everything that looked "empty" was actually erroring).
--
-- Fix: SECURITY DEFINER functions execute with the privileges of their owner
-- (the migration-running role, which bypasses RLS), so calling one from inside a
-- policy's USING clause resolves the caller's role/app_user_id without
-- re-triggering RLS on users/profiles. Behavior is otherwise unchanged — same
-- lookups, just non-recursive.

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.users WHERE uuid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE uuid = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM public;
REVOKE ALL ON FUNCTION public.current_user_role() FROM public;
REVOKE ALL ON FUNCTION public.current_profile_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, anon;

-- users (self-referencing policy — the original source of the recursion)
DROP POLICY IF EXISTS users_policy ON users;
CREATE POLICY users_policy ON users FOR ALL USING (
  uuid = auth.uid() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- profiles (three overlapping policies, two of them self-referencing)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  public.current_profile_role() = ANY (ARRAY['manager','super_admin'])
);

DROP POLICY IF EXISTS "Admins/Managers can update all profiles" ON profiles;
CREATE POLICY "Admins/Managers can update all profiles" ON profiles FOR UPDATE TO authenticated USING (
  auth.uid() = id OR public.current_profile_role() = ANY (ARRAY['manager','super_admin'])
);

DROP POLICY IF EXISTS "Admins/Managers can view all profiles" ON profiles;
CREATE POLICY "Admins/Managers can view all profiles" ON profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR public.current_profile_role() = ANY (ARRAY['manager','super_admin'])
);

-- admin_profiles
DROP POLICY IF EXISTS admin_profiles_policy ON admin_profiles;
CREATE POLICY admin_profiles_policy ON admin_profiles FOR ALL USING (
  user_id = public.current_app_user_id() OR public.current_user_role() = 'super_admin'
);

-- audit_logs
DROP POLICY IF EXISTS audit_logs_policy ON audit_logs;
CREATE POLICY audit_logs_policy ON audit_logs FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- bank_change_requests
DROP POLICY IF EXISTS bank_change_requests_policy ON bank_change_requests;
CREATE POLICY bank_change_requests_policy ON bank_change_requests FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- booking_slots
DROP POLICY IF EXISTS booking_slots_policy ON booking_slots;
CREATE POLICY booking_slots_policy ON booking_slots FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- crop_inspections
DROP POLICY IF EXISTS crop_inspections_policy ON crop_inspections;
CREATE POLICY crop_inspections_policy ON crop_inspections FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- crops
DROP POLICY IF EXISTS crops_policy ON crops;
CREATE POLICY crops_policy ON crops FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- distributor_orders
DROP POLICY IF EXISTS distributor_orders_policy ON distributor_orders;
CREATE POLICY distributor_orders_policy ON distributor_orders FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- farm_visits
DROP POLICY IF EXISTS farm_visits_policy ON farm_visits;
CREATE POLICY farm_visits_policy ON farm_visits FOR ALL USING (
  farmer_id = public.current_app_user_id() OR admin_id = public.current_app_user_id()
  OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- farmer_profiles
DROP POLICY IF EXISTS farmer_profiles_policy ON farmer_profiles;
CREATE POLICY farmer_profiles_policy ON farmer_profiles FOR ALL USING (
  user_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- grain_sales
DROP POLICY IF EXISTS grain_sales_policy ON grain_sales;
CREATE POLICY grain_sales_policy ON grain_sales FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- market_rates (admin write policy only; public SELECT-true policy is untouched)
DROP POLICY IF EXISTS market_rates_admin ON market_rates;
CREATE POLICY market_rates_admin ON market_rates FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- notifications
DROP POLICY IF EXISTS notifications_policy ON notifications;
CREATE POLICY notifications_policy ON notifications FOR ALL USING (
  user_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- seed_purchases
DROP POLICY IF EXISTS seed_purchases_policy ON seed_purchases;
CREATE POLICY seed_purchases_policy ON seed_purchases FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- seed_warehouses
DROP POLICY IF EXISTS seed_warehouses_admin ON seed_warehouses;
CREATE POLICY seed_warehouses_admin ON seed_warehouses FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- seeds
DROP POLICY IF EXISTS seeds_admin ON seeds;
CREATE POLICY seeds_admin ON seeds FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- transactions
DROP POLICY IF EXISTS transactions_policy ON transactions;
CREATE POLICY transactions_policy ON transactions FOR ALL USING (
  farmer_id = public.current_app_user_id() OR public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- warehouse_inventory
DROP POLICY IF EXISTS warehouse_inventory_admin ON warehouse_inventory;
CREATE POLICY warehouse_inventory_admin ON warehouse_inventory FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- warehouse_slots
DROP POLICY IF EXISTS warehouse_slots_admin ON warehouse_slots;
CREATE POLICY warehouse_slots_admin ON warehouse_slots FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);

-- warehouses
DROP POLICY IF EXISTS warehouses_admin ON warehouses;
CREATE POLICY warehouses_admin ON warehouses FOR ALL USING (
  public.current_user_role() = ANY (ARRAY['manager','super_admin'])
);
