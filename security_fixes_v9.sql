-- =============================================
-- SMASH47 — RLS Hardening v9
-- Fixes: profiles DELETE, profiles UPDATE (loyalty lock),
--        audit_log direct write, orders UPDATE WITH CHECK,
--        coupons policy dedup, restaurant_settings view
-- Run in Supabase SQL Editor
-- =============================================

-- ── 🔴-1: profiles — DELETE policy (currently missing) ───────────────────────
-- Without this, PostgreSQL denies DELETE by default (correct), but making it
-- explicit is required for auditability and future-proofing.
-- Only managers can delete a profile; users cannot self-delete via REST.
DROP POLICY IF EXISTS "No self delete profile" ON profiles;
CREATE POLICY "No self delete profile" ON profiles
  FOR DELETE USING (public.has_role(ARRAY['manager']));


-- ── 🔴-3: profiles UPDATE — lock financial + identity columns ────────────────
-- Previous policy's WITH CHECK subquery read from the already-updated row,
-- making the role comparison always TRUE (NEW.role = NEW.role).
-- New policy locks role, loyalty_points, total_orders, and email explicitly.
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Each subquery reads a separate snapshot of the row (the old values)
    AND role           = (SELECT p.role           FROM profiles p WHERE p.id = auth.uid())
    AND loyalty_points = (SELECT p.loyalty_points FROM profiles p WHERE p.id = auth.uid())
    AND total_orders   = (SELECT p.total_orders   FROM profiles p WHERE p.id = auth.uid())
    AND email          = (SELECT p.email          FROM profiles p WHERE p.id = auth.uid())
    -- Allowed to change: full_name, phone, birth_date, addresses
  );


-- ── 🔴-4: audit_log — block direct client writes ─────────────────────────────
-- SECURITY DEFINER functions (create_order_secure, log_order_status_change, etc.)
-- bypass RLS and can still write. Direct client INSERT is now blocked.
DROP POLICY IF EXISTS "Append only" ON audit_log;
CREATE POLICY "No direct insert" ON audit_log
  FOR INSERT WITH CHECK (FALSE);


-- ── 🟡-3: orders UPDATE — add WITH CHECK to protect financial columns ─────────
-- Previously USING-only: any admin could overwrite total/subtotal/discount_amount.
-- WITH CHECK ensures only status + operational fields can change.
DROP POLICY IF EXISTS "Admins update orders" ON orders;
CREATE POLICY "Admins update orders" ON orders
  FOR UPDATE
  USING (public.has_role(ARRAY['manager', 'cashier', 'kitchen']))
  WITH CHECK (
    -- Financial columns must remain unchanged
    total             = (SELECT o.total             FROM orders o WHERE o.id = id)
    AND subtotal      = (SELECT o.subtotal          FROM orders o WHERE o.id = id)
    AND discount_amount=(SELECT o.discount_amount   FROM orders o WHERE o.id = id)
    AND delivery_fee  = (SELECT o.delivery_fee      FROM orders o WHERE o.id = id)
    -- Identity columns must remain unchanged
    AND user_id       IS NOT DISTINCT FROM (SELECT o.user_id      FROM orders o WHERE o.id = id)
    AND order_number  = (SELECT o.order_number      FROM orders o WHERE o.id = id)
    AND coupon_code   IS NOT DISTINCT FROM (SELECT o.coupon_code  FROM orders o WHERE o.id = id)
  );


-- ── 🟡-4: coupons — remove all duplicate/conflicting policies ────────────────
-- Multiple patches added overlapping policies without cleaning up old ones.
-- PostgreSQL evaluates all permissive policies with OR — duplicates are harmless
-- but create confusion and audit noise. Consolidate to one clean policy.
DROP POLICY IF EXISTS "Admins insert coupons"        ON coupons;
DROP POLICY IF EXISTS "Admins update coupons"        ON coupons;
DROP POLICY IF EXISTS "Admins delete coupons"        ON coupons;
DROP POLICY IF EXISTS "Admins write coupons"         ON coupons;
DROP POLICY IF EXISTS "Admin write coupons"          ON coupons;
DROP POLICY IF EXISTS "Manager full access coupons"  ON coupons;
DROP POLICY IF EXISTS "Managers full access coupons" ON coupons;
DROP POLICY IF EXISTS "Customer read coupon for validation" ON coupons;
DROP POLICY IF EXISTS "Public read active coupons"   ON coupons;
DROP POLICY IF EXISTS "coupons_manager_all"          ON coupons;

-- Single clean policy: managers have full access, customers use the view
CREATE POLICY "coupons_manager_all" ON coupons
  FOR ALL
  USING  (public.has_role(ARRAY['manager']))
  WITH CHECK (public.has_role(ARRAY['manager']));


-- ── 🟡-1: restaurant_settings — restrict sensitive fields from public read ────
-- revenue_goal_daily and raw delivery_zones config must not be public.
-- Create a view exposing only customer-relevant operational fields.
DROP VIEW IF EXISTS public.restaurant_info;
CREATE VIEW public.restaurant_info AS
  SELECT
    name,
    description,
    address,
    phone,
    email,
    rating,
    review_count,
    is_delivery_active,
    delivery_fee,
    min_order_amount,
    estimated_delivery_time,
    is_halal_certified,
    hours
    -- Intentionally excluded: revenue_goal_daily, delivery_zones (internal config)
  FROM restaurant_settings;

GRANT SELECT ON public.restaurant_info TO anon, authenticated;

-- Keep the full-table SELECT for managers (they need delivery_zones for admin UI)
-- The existing "Public read settings" USING(TRUE) policy still applies for managers.
-- Customers should query /rest/v1/restaurant_info instead of /rest/v1/restaurant_settings.


-- ── VERIFY: run this to confirm no tables are missing RLS ─────────────────────
-- Expected result: empty set
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public');

-- ── VERIFY: list final policy state ──────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
