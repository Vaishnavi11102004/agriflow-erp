-- Harden RLS: close public write access to warehouse tables, enable RLS on
-- tables that were fully exposed via PostgREST (admin_profiles, distributor_orders, otps).

-- warehouses / warehouse_slots / warehouse_inventory / seed_warehouses previously had a
-- single "ALL USING (true)" policy, letting any anon/authenticated request write to them.
-- Split into: public SELECT (true) + manager/super_admin-only writes, matching the
-- existing seeds_admin / seeds_policy pattern already used elsewhere in this schema.

DROP POLICY IF EXISTS warehouses_policy ON warehouses;
CREATE POLICY warehouses_policy ON warehouses FOR SELECT USING (true);
CREATE POLICY warehouses_admin ON warehouses FOR ALL USING (
  (SELECT users.role FROM users WHERE users.uuid = auth.uid()) = ANY (ARRAY['manager','super_admin'])
);

DROP POLICY IF EXISTS warehouse_slots_policy ON warehouse_slots;
CREATE POLICY warehouse_slots_policy ON warehouse_slots FOR SELECT USING (true);
CREATE POLICY warehouse_slots_admin ON warehouse_slots FOR ALL USING (
  (SELECT users.role FROM users WHERE users.uuid = auth.uid()) = ANY (ARRAY['manager','super_admin'])
);

DROP POLICY IF EXISTS warehouse_inventory_policy ON warehouse_inventory;
CREATE POLICY warehouse_inventory_policy ON warehouse_inventory FOR SELECT USING (true);
CREATE POLICY warehouse_inventory_admin ON warehouse_inventory FOR ALL USING (
  (SELECT users.role FROM users WHERE users.uuid = auth.uid()) = ANY (ARRAY['manager','super_admin'])
);

DROP POLICY IF EXISTS seed_warehouses_policy ON seed_warehouses;
CREATE POLICY seed_warehouses_policy ON seed_warehouses FOR SELECT USING (true);
CREATE POLICY seed_warehouses_admin ON seed_warehouses FOR ALL USING (
  (SELECT users.role FROM users WHERE users.uuid = auth.uid()) = ANY (ARRAY['manager','super_admin'])
);

-- admin_profiles: policy already exists (owner-or-super_admin) but RLS was never enabled,
-- so it had no effect and the table was fully open.
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- distributor_orders: no distributor role/portal exists in the app yet; lock down to
-- manager/super_admin until a distributor-facing flow is built.
ALTER TABLE distributor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY distributor_orders_policy ON distributor_orders FOR ALL USING (
  (SELECT users.role FROM users WHERE users.uuid = auth.uid()) = ANY (ARRAY['manager','super_admin'])
);

-- otps: legacy phone-OTP auth bridge, no longer used by the app. Enable RLS with no
-- policy so it defaults to deny-all for anon/authenticated (service role still bypasses RLS).
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
