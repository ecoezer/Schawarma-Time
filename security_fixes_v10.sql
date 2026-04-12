-- =============================================
-- SMASH47 — RLS Hardening v10
-- Fixes:
--   🔴-A: restaurant_settings SELECT policy was USING(TRUE) — exposed
--         revenue_goal_daily and delivery_zones to ALL authenticated users.
--         New policy restricts direct table access to manager/cashier only.
--         Public reads must go through the restaurant_info view (v9).
--   🟡-A: protect_role_column() trigger — NULL safety guard added.
--         Previously did not handle auth.uid() IS NULL edge case.
-- Run in Supabase SQL Editor
-- =============================================


-- ── 🔴-A: restaurant_settings — lock direct table reads to staff only ─────────
-- v9 created the restaurant_info view for public reads, but the original
-- USING(TRUE) SELECT policy was never dropped, meaning any authenticated user
-- could still call /rest/v1/restaurant_settings and read revenue_goal_daily
-- and delivery_zones. This patch closes that gap.

DROP POLICY IF EXISTS "Public read settings" ON restaurant_settings;

CREATE POLICY "Staff read settings" ON restaurant_settings
  FOR SELECT
  USING (public.has_role(ARRAY['manager', 'cashier']));


-- ── 🟡-A: protect_role_column() trigger — NULL-safe auth.uid() guard ─────────
-- Previous version did not guard against auth.uid() IS NULL (service-role
-- or unauthenticated call paths hitting the trigger). Rewrite to be explicit.
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no JWT context (service role or internal), allow change (e.g. admin scripts)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated users cannot elevate their own role
  IF NEW.role <> OLD.role THEN
    -- Only a manager can change roles
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    ) THEN
      RAISE EXCEPTION 'Role changes require manager privileges';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ── VERIFY ────────────────────────────────────────────────────────────────────
-- After running, confirm restaurant_settings no longer has a USING(TRUE) policy:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'restaurant_settings' AND schemaname = 'public';
--
-- Expected: only "Staff read settings" for SELECT (USING = has_role check)
--           and whatever UPDATE/INSERT/DELETE policies exist for managers.
--
-- Also verify public view still works:
-- SELECT * FROM restaurant_info;   -- should succeed for anon/authenticated
-- SELECT * FROM restaurant_settings; -- should fail (42501) for customer JWT
