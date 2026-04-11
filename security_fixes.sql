-- =============================================
-- SMASH47 — Security Fixes
-- Run in Supabase SQL Editor
-- =============================================

-- ─── FIX 1: IDOR — user_id must equal auth.uid() on insert ───────────────────
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users insert orders" ON orders;

CREATE POLICY "Authenticated users insert orders" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );


-- ─── FIX 2: Coupon race condition — row lock + server-side max_uses check ─────
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code text)
RETURNS void AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon
    FROM coupons
    WHERE code = coupon_code
    FOR UPDATE; -- acquires row-level lock, eliminates race condition

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon not found';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'Coupon is not active';
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'Coupon max uses exceeded';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'Coupon has expired';
  END IF;

  UPDATE coupons SET used_count = used_count + 1 WHERE code = coupon_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── FIX 3: Negative price / discount abuse — DB trigger ─────────────────────
CREATE OR REPLACE FUNCTION validate_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total < 0 THEN
    RAISE EXCEPTION 'Invalid order: total cannot be negative';
  END IF;

  IF NEW.subtotal < 0 THEN
    RAISE EXCEPTION 'Invalid order: subtotal cannot be negative';
  END IF;

  IF NEW.discount_amount < 0 THEN
    RAISE EXCEPTION 'Invalid order: discount cannot be negative';
  END IF;

  IF NEW.discount_amount > NEW.subtotal THEN
    RAISE EXCEPTION 'Invalid order: discount exceeds subtotal';
  END IF;

  IF NEW.delivery_fee < 0 THEN
    RAISE EXCEPTION 'Invalid order: delivery fee cannot be negative';
  END IF;

  -- Verify total arithmetic (allow 1 cent rounding tolerance)
  IF ABS((NEW.subtotal + NEW.delivery_fee - NEW.discount_amount) - NEW.total) > 0.01 THEN
    RAISE EXCEPTION 'Invalid order: total does not match subtotal + delivery_fee - discount';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_order_integrity ON orders;
CREATE TRIGGER check_order_integrity
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order();


-- ─── FIX 4: Coupons — admins must read all (active + inactive) ───────────────
DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins read all coupons" ON coupons;
DROP POLICY IF EXISTS "Admins write coupons" ON coupons;

CREATE POLICY "Public read active coupons" ON coupons
  FOR SELECT USING (
    is_active = TRUE
    OR public.has_role(ARRAY['manager'])
  );

CREATE POLICY "Admins write coupons" ON coupons
  FOR ALL USING (public.has_role(ARRAY['manager']));


-- ─── FIX 5: Managers can update profiles (e.g. change roles) ─────────────────
DROP POLICY IF EXISTS "Managers update all profiles" ON profiles;

CREATE POLICY "Managers update all profiles" ON profiles
  FOR UPDATE USING (public.has_role(ARRAY['manager']));


-- ─── FIX 6: Verify no table is missing RLS (run & check output is empty) ──────
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_policies
);
-- If this returns any rows → those tables have NO RLS → run:
-- ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;


-- ─── FIX 7: user_id must equal auth.uid() — also enforce on DB level via trigger
CREATE OR REPLACE FUNCTION enforce_order_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create orders';
  END IF;

  -- Force user_id to always be the authenticated user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_order_ownership ON orders;
CREATE TRIGGER enforce_order_ownership
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_user_id();
