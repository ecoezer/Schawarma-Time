-- =============================================
-- SMASH47 — Security Fixes v2
-- Run in Supabase SQL Editor
-- =============================================

-- ─── FIX 1: profiles — block direct INSERT (only trigger allowed) ─────────────
DROP POLICY IF EXISTS "No direct profile insert" ON profiles;
CREATE POLICY "No direct profile insert" ON profiles
  FOR INSERT WITH CHECK (FALSE);
-- Note: handle_new_user() trigger uses SECURITY DEFINER so it bypasses this — correct behavior


-- ─── FIX 2: profiles — prevent role escalation via UPDATE ────────────────────
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    -- user cannot change their own role
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR public.has_role(ARRAY['manager'])
  );

-- Belt-and-suspenders: trigger that enforces role protection at DB level
CREATE OR REPLACE FUNCTION protect_role_column()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    ) THEN
      RAISE EXCEPTION 'Permission denied: only managers can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_protection ON profiles;
CREATE TRIGGER enforce_role_protection
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_role_column();


-- ─── FIX 3: restaurant_settings — replace FOR ALL with explicit operations ────
DROP POLICY IF EXISTS "Admin write settings" ON restaurant_settings;

CREATE POLICY "Admin insert settings" ON restaurant_settings
  FOR INSERT WITH CHECK (public.has_role(ARRAY['manager']));

CREATE POLICY "Admin update settings" ON restaurant_settings
  FOR UPDATE USING (public.has_role(ARRAY['manager']));

CREATE POLICY "Admin delete settings" ON restaurant_settings
  FOR DELETE USING (public.has_role(ARRAY['manager']));


-- ─── FIX 4: coupons — replace FOR ALL with explicit operations ───────────────
DROP POLICY IF EXISTS "Admins write coupons" ON coupons;

CREATE POLICY "Admins insert coupons" ON coupons
  FOR INSERT WITH CHECK (public.has_role(ARRAY['manager']));

CREATE POLICY "Admins update coupons" ON coupons
  FOR UPDATE USING (public.has_role(ARRAY['manager']));

CREATE POLICY "Admins delete coupons" ON coupons
  FOR DELETE USING (public.has_role(ARRAY['manager']));


-- ─── FIX 5: orders — explicit DELETE block ───────────────────────────────────
DROP POLICY IF EXISTS "No order deletion" ON orders;
CREATE POLICY "No order deletion" ON orders
  FOR DELETE USING (FALSE);


-- ─── FIX 6: categories — replace FOR ALL with explicit operations ─────────────
DROP POLICY IF EXISTS "Admin write categories" ON categories;

CREATE POLICY "Admin insert categories" ON categories
  FOR INSERT WITH CHECK (public.has_role(ARRAY['manager', 'cashier']));

CREATE POLICY "Admin update categories" ON categories
  FOR UPDATE USING (public.has_role(ARRAY['manager', 'cashier']));

CREATE POLICY "Admin delete categories" ON categories
  FOR DELETE USING (public.has_role(ARRAY['manager']));


-- ─── FIX 7: products — replace FOR ALL with explicit operations ───────────────
DROP POLICY IF EXISTS "Admin write products" ON products;

CREATE POLICY "Admin insert products" ON products
  FOR INSERT WITH CHECK (public.has_role(ARRAY['manager', 'cashier']));

CREATE POLICY "Admin update products" ON products
  FOR UPDATE USING (public.has_role(ARRAY['manager', 'cashier']));

CREATE POLICY "Admin delete products" ON products
  FOR DELETE USING (public.has_role(ARRAY['manager']));


-- ─── VERIFY: check no table is missing RLS ───────────────────────────────────
-- Run this after — output should be EMPTY
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_policies
);


-- ─── VERIFY: list all active policies ────────────────────────────────────────
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
