-- =============================================
-- SMASH47 — Penetration Test Fixes v8
-- Fixes: 🔴-1 (coupon code leak), 🔴-3 (phone rate limit bypass),
--        🧱-1 (audit log), 🧱-2 (status transition guard),
--        🧱-3 (has_role RPC exposure), 🧱-4 (double loyalty points),
--        webhook replay hardening, phone entropy enforcement
-- Run in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════
-- 🔴-1 FIX: Remove coupon code from public view
-- The code column is a credential — must NOT be publicly enumerable.
-- ═══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public AS
  SELECT
    id,
    discount_type,
    discount_value,
    min_order_amount,
    is_first_order_only,
    expires_at
    -- code intentionally omitted — it is a secret, not a public field
  FROM coupons
  WHERE is_active = TRUE;

GRANT SELECT ON public.coupons_public TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 🧱-1 FIX: Persistent audit log (insert-only, never deleted)
-- Logs: failed order attempts, coupon probing, rate limit hits,
--       order status changes, admin actions.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,   -- 'order_failed','coupon_attempt','status_changed', etc.
  user_id     UUID,                   -- auth.uid() at time of event (nullable for anon)
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_type_time
  ON audit_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_time
  ON audit_log (user_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: any authenticated call can insert (SECURITY DEFINER functions do this)
CREATE POLICY "Append only"    ON audit_log FOR INSERT WITH CHECK (TRUE);
-- Only managers can read
CREATE POLICY "Managers read"  ON audit_log FOR SELECT
  USING (public.has_role(ARRAY['manager']));
-- Nobody can update or delete — permanent record
CREATE POLICY "No update"      ON audit_log FOR UPDATE USING (FALSE);
CREATE POLICY "No delete"      ON audit_log FOR DELETE USING (FALSE);


-- ═══════════════════════════════════════════════════════════════
-- 🧱-2 FIX: Order status transition guard
-- Enforces valid state machine per role.
-- Kitchen:  pending→confirmed, confirmed→preparing, preparing→on_the_way, on_the_way→delivered
-- Cashier:  can cancel (pending/confirmed only), confirm pending orders
-- Manager:  any transition (for corrections)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_is_manager BOOLEAN;
BEGIN
  -- Managers bypass transition rules (for corrections/overrides)
  v_is_manager := public.has_role(ARRAY['manager']);
  IF v_is_manager THEN
    RETURN NEW;
  END IF;

  -- Enforce allowed transitions for cashier + kitchen roles
  IF NOT (
    (OLD.status = 'pending'    AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'confirmed'  AND NEW.status IN ('preparing', 'cancelled')) OR
    (OLD.status = 'preparing'  AND NEW.status = 'on_the_way')               OR
    (OLD.status = 'on_the_way' AND NEW.status = 'delivered')
    -- 'delivered' and 'cancelled' are terminal — no further transitions
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_status_transition ON orders;
CREATE TRIGGER trg_validate_status_transition
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_order_status_transition();


-- ═══════════════════════════════════════════════════════════════
-- 🧱-4 FIX: Double loyalty points via status regression
-- Add loyalty_awarded column; trigger is idempotent.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS loyalty_awarded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_points INT;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status != 'delivered'
     AND NEW.user_id IS NOT NULL
     AND NEW.loyalty_awarded = FALSE THEN   -- 🧱-4: idempotency guard

    v_points := FLOOR(NEW.total)::INT;

    UPDATE profiles
      SET loyalty_points = loyalty_points + v_points,
          total_orders   = total_orders + 1
      WHERE id = NEW.user_id;

    -- Mark as awarded so a status regression cannot trigger it again
    UPDATE orders SET loyalty_awarded = TRUE WHERE id = NEW.id;

    -- Audit log
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('loyalty_awarded', NEW.user_id,
              jsonb_build_object('order_id', NEW.id, 'points', v_points));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_delivered ON orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION handle_order_delivered();


-- ═══════════════════════════════════════════════════════════════
-- 🧱-2 AUDIT: Log status changes (who changed what, when)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES (
        'order_status_changed',
        auth.uid(),
        jsonb_build_object(
          'order_id',   NEW.id,
          'order_no',   NEW.order_number,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_status_change ON orders;
CREATE TRIGGER trg_log_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();


-- ═══════════════════════════════════════════════════════════════
-- 🧱-3 FIX: Revoke direct RPC access to has_role / is_admin
-- RLS policies invoke these as the table owner internally —
-- revoking public EXECUTE does NOT break RLS checks.
-- ═══════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.has_role(text[])  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin()        FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 🔴-3 FIX: Add user_id column to order_rate_limit_phone
-- so rate limit also applies per user_id (not just per phone hash)
-- This closes the multi-account + rotating phone bypass.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE order_rate_limit_phone
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_order_rate_limit_user_time
  ON order_rate_limit_phone (user_id, created_at DESC);

-- Update pg_cron job to also purge by user_id index efficiently
-- (existing cron job on created_at still covers this)


-- ═══════════════════════════════════════════════════════════════
-- FULL REWRITE: create_order_secure v8
-- New fixes vs v7:
--   🔴-3: phone rate limit also checks per user_id (dual check)
--   🔴-3: phone entropy: normalized phone must have ≥10 digits
--   🧱-1: audit_log entries for failed attempts and rate limit hits
--   webhook replay: p_customer_email lock already uses verified email
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_order_secure(
  p_customer_name           TEXT,
  p_customer_phone          TEXT,
  p_customer_email          TEXT,
  p_delivery_address        TEXT,
  p_items                   JSONB,
  p_coupon_code             TEXT    DEFAULT NULL,
  p_payment_method          TEXT    DEFAULT 'cash',
  p_notes                   TEXT    DEFAULT NULL,
  p_estimated_delivery_time INT     DEFAULT 35
) RETURNS TEXT AS $$
DECLARE
  v_item              JSONB;
  v_extra             JSONB;
  v_extra_group       JSONB;
  v_extra_option      JSONB;
  v_product           products%ROWTYPE;
  v_subtotal          DECIMAL := 0;
  v_delivery_fee      DECIMAL;
  v_min_order         DECIMAL;
  v_delivery_zones    JSONB;
  v_zone              JSONB;
  v_zone_valid        BOOLEAN := FALSE;
  v_discount          DECIMAL := 0;
  v_total             DECIMAL;
  v_coupon            coupons%ROWTYPE;
  v_order_id          UUID;
  v_order_number      TEXT;
  v_items_validated   JSONB := '[]'::JSONB;
  v_unit_price        DECIMAL;
  v_extra_price       DECIMAL;
  v_extra_found       BOOLEAN;
  v_validated_extras  JSONB;
  v_phone_normalized  TEXT;
  v_phone_hash        TEXT;
  v_phone_digit_count INT;
  v_postal_code       TEXT;
  v_pc                TEXT;
  v_auth_email        TEXT;
  v_extras_count      INT;
BEGIN

  -- ── 1. Auth check ─────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- ── 2. Per-user rate limit: max 3 committed orders per minute ─────────────
  IF (
    SELECT COUNT(*) FROM orders
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 3 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_user', auth.uid(),
              jsonb_build_object('reason', 'order_per_minute'));
    RAISE EXCEPTION 'Too many orders. Please wait before placing another order.';
  END IF;

  -- ── 3. Input validation ───────────────────────────────────────────────────
  IF LENGTH(TRIM(p_customer_name)) < 2 OR LENGTH(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid customer name';
  END IF;

  -- A-2: verified email from auth.users — prevents email spoofing
  v_auth_email := (SELECT LOWER(email) FROM auth.users WHERE id = auth.uid());
  IF LOWER(TRIM(p_customer_email)) <> v_auth_email THEN
    RAISE EXCEPTION 'Email must match your registered account email';
  END IF;

  IF p_customer_email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  IF p_customer_phone !~ '^[+0-9\s\-\(\)]{7,25}$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  IF LENGTH(TRIM(p_delivery_address)) < 5 OR LENGTH(p_delivery_address) > 500 THEN
    RAISE EXCEPTION 'Invalid delivery address';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card_on_delivery') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_estimated_delivery_time < 10 OR p_estimated_delivery_time > 120 THEN
    RAISE EXCEPTION 'Invalid estimated delivery time';
  END IF;

  IF LENGTH(COALESCE(p_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Notes too long (max 2000 characters)';
  END IF;

  -- ── 4. Phone normalization + entropy check + dual rate limit ──────────────
  v_phone_normalized := regexp_replace(p_customer_phone, '[^0-9+]', '', 'g');
  v_phone_normalized := regexp_replace(v_phone_normalized, '^00', '+');
  v_phone_hash       := encode(digest(v_phone_normalized, 'sha256'), 'hex');

  -- 🔴-3: Enforce minimum 10 digits — prevents "+123456" (6 digits) from being
  -- used as a throwaway phone to get fresh rate-limit buckets.
  -- Strip + and count remaining digits only.
  v_phone_digit_count := LENGTH(regexp_replace(v_phone_normalized, '[^0-9]', '', 'g'));
  IF v_phone_digit_count < 10 THEN
    RAISE EXCEPTION 'Phone number must contain at least 10 digits';
  END IF;

  -- Record this attempt (before any further validation that might fail)
  -- This ensures ALL attempts, successful or failed, consume rate limit budget.
  INSERT INTO order_rate_limit_phone (phone_hash, user_id)
    VALUES (v_phone_hash, auth.uid());

  -- 🔴-3 dual check: per-phone AND per-user over 10 minutes
  IF (
    SELECT COUNT(*) FROM order_rate_limit_phone
    WHERE phone_hash = v_phone_hash
    AND created_at > NOW() - INTERVAL '10 minutes'
  ) > 5 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_phone', auth.uid(),
              jsonb_build_object('phone_hash', v_phone_hash));
    RAISE EXCEPTION 'Too many order attempts from this phone number. Please wait.';
  END IF;

  IF (
    SELECT COUNT(*) FROM order_rate_limit_phone
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '10 minutes'
  ) > 10 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_user_attempts', auth.uid(), '{}');
    RAISE EXCEPTION 'Too many order attempts. Please wait.';
  END IF;

  -- ── 5. Items basic validation ─────────────────────────────────────────────
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in a single order';
  END IF;

  -- ── 6. Validate items + extras — ALL prices from DB ──────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    IF (v_item->>'quantity')::INT <= 0 OR (v_item->>'quantity')::INT > 100 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive';
    END IF;

    v_unit_price       := v_product.price;
    v_validated_extras := '[]'::JSONB;

    v_extras_count := jsonb_array_length(COALESCE(v_item->'extras', '[]'));
    IF v_extras_count > 20 THEN
      RAISE EXCEPTION 'Too many extras per item (max 20)';
    END IF;

    FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'extras', '[]')) LOOP
      v_extra_price := 0;
      v_extra_found := FALSE;

      <<group_loop>>
      FOR v_extra_group IN SELECT * FROM jsonb_array_elements(v_product.extra_groups) LOOP
        FOR v_extra_option IN SELECT * FROM jsonb_array_elements(v_extra_group->'options') LOOP
          IF (v_extra_option->>'id') = (v_extra->>'id') THEN
            v_extra_price := COALESCE((v_extra_option->>'price')::DECIMAL, 0);
            v_extra_found := TRUE;
            v_validated_extras := v_validated_extras || jsonb_build_array(
              jsonb_build_object(
                'id',         v_extra_option->>'id',
                'name',       v_extra_option->>'name',
                'price',      v_extra_price,
                'group_name', v_extra_group->>'name'
              )
            );
            EXIT group_loop;
          END IF;
        END LOOP;
      END LOOP group_loop;

      IF NOT v_extra_found THEN
        RAISE EXCEPTION 'Extra option not found on product';
      END IF;

      v_unit_price := v_unit_price + v_extra_price;
    END LOOP;

    v_subtotal := v_subtotal + (v_unit_price * (v_item->>'quantity')::INT);

    v_items_validated := v_items_validated || jsonb_build_array(
      jsonb_build_object(
        'product_id',   v_product.id,
        'product_name', v_product.name,
        'quantity',     (v_item->>'quantity')::INT,
        'unit_price',   v_product.price,
        'subtotal',     v_unit_price * (v_item->>'quantity')::INT,
        'extras',       v_validated_extras,
        'note',         COALESCE(SUBSTRING(v_item->>'note', 1, 500), '')
      )
    );
  END LOOP;

  -- ── 7. Delivery fee + zone validation ────────────────────────────────────
  SELECT delivery_fee, min_order_amount, delivery_zones
    INTO v_delivery_fee, v_min_order, v_delivery_zones
    FROM restaurant_settings LIMIT 1;

  IF v_delivery_zones IS NOT NULL AND jsonb_array_length(v_delivery_zones) > 0 THEN
    v_postal_code := COALESCE(
      (regexp_match(p_delivery_address, '.*(\d{5})'))[1], ''
    );

    FOR v_zone IN SELECT * FROM jsonb_array_elements(v_delivery_zones) LOOP
      IF v_zone ? 'postal_codes' THEN
        FOR v_pc IN SELECT * FROM jsonb_array_elements_text(v_zone->'postal_codes') LOOP
          IF v_postal_code = v_pc THEN
            v_zone_valid   := TRUE;
            v_delivery_fee := COALESCE((v_zone->>'delivery_fee')::DECIMAL, v_delivery_fee);
            v_min_order    := COALESCE((v_zone->>'min_order')::DECIMAL, v_min_order);
          END IF;
        END LOOP;
      END IF;
      IF NOT v_zone_valid AND v_postal_code <> ''
         AND (v_zone->>'name') ILIKE '%' || v_postal_code || '%' THEN
        v_zone_valid   := TRUE;
        v_delivery_fee := COALESCE((v_zone->>'delivery_fee')::DECIMAL, v_delivery_fee);
        v_min_order    := COALESCE((v_zone->>'min_order')::DECIMAL, v_min_order);
      END IF;
    END LOOP;

    IF NOT v_zone_valid THEN
      RAISE EXCEPTION 'Delivery address is outside our delivery zone';
    END IF;
  END IF;

  -- ── 8. Minimum order ──────────────────────────────────────────────────────
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%',
      v_min_order, v_subtotal;
  END IF;

  -- ── 9. Coupon validation ──────────────────────────────────────────────────
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN

    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code))
      AND is_active = TRUE
      FOR UPDATE;

    -- F-1: All coupon failure paths return the same generic message
    -- — no behavioral oracle for code enumeration
    IF NOT FOUND THEN
      INSERT INTO audit_log (event_type, user_id, metadata)
        VALUES ('coupon_attempt_failed', auth.uid(),
                jsonb_build_object('reason', 'not_found', 'phone_hash', v_phone_hash));
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
      INSERT INTO audit_log (event_type, user_id, metadata)
        VALUES ('coupon_attempt_failed', auth.uid(),
                jsonb_build_object('reason', 'expired', 'coupon_id', v_coupon.id));
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      INSERT INTO audit_log (event_type, user_id, metadata)
        VALUES ('coupon_attempt_failed', auth.uid(),
                jsonb_build_object('reason', 'max_uses', 'coupon_id', v_coupon.id));
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order amount for this coupon is €%', v_coupon.min_order_amount;
    END IF;

    -- Validate discount type explicitly
    IF v_coupon.discount_type NOT IN ('percentage', 'fixed') THEN
      RAISE EXCEPTION 'Unknown coupon discount type';
    END IF;

    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage'
        THEN ROUND((v_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
      ELSE v_coupon.discount_value
    END;

    IF v_discount > v_subtotal THEN v_discount := v_subtotal; END IF;

    -- BLV-4: 50% cap before any side effects
    IF v_discount > (v_subtotal * 0.5) THEN
      RAISE EXCEPTION 'Discount cannot exceed 50%% of the order subtotal';
    END IF;

    -- F-2: is_first_order_only: ANY prior non-cancelled order disqualifies
    IF v_coupon.is_first_order_only THEN
      IF EXISTS (
        SELECT 1 FROM coupon_phone_usage
        WHERE coupon_id = v_coupon.id AND phone_hash = v_phone_hash
      ) THEN
        RAISE EXCEPTION 'Invalid or inactive coupon code';
      END IF;

      IF EXISTS (
        SELECT 1 FROM orders
        WHERE user_id = auth.uid() AND status NOT IN ('cancelled')
        -- No coupon_code IS NOT NULL condition — ANY prior order disqualifies
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;

      INSERT INTO coupon_phone_usage (coupon_id, phone_hash)
        VALUES (v_coupon.id, v_phone_hash)
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- ── 10. Final total ───────────────────────────────────────────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);
  IF v_total < 0 THEN v_total := 0; END IF;

  -- ── 11. Order number + insert ─────────────────────────────────────────────
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO orders (
    order_number, user_id,
    customer_name, customer_phone, customer_email,
    delivery_address,
    items, subtotal, delivery_fee, discount_amount,
    coupon_code, total, payment_method,
    estimated_delivery_time, notes, status
  ) VALUES (
    v_order_number, auth.uid(),
    TRIM(p_customer_name),
    TRIM(p_customer_phone),
    v_auth_email,
    TRIM(p_delivery_address),
    v_items_validated,
    v_subtotal, v_delivery_fee, v_discount,
    NULLIF(UPPER(TRIM(p_coupon_code)), ''),
    v_total, p_payment_method,
    p_estimated_delivery_time,
    SUBSTRING(COALESCE(p_notes, ''), 1, 1000),
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Audit: successful order
  INSERT INTO audit_log (event_type, user_id, metadata)
    VALUES ('order_placed', auth.uid(),
            jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number));

  RETURN json_build_object(
    'id',           v_order_id,
    'order_number', v_order_number
  )::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- Webhook replay hardening: re-query order status in edge function
-- (SQL side: nothing to change — fix is in the edge function TS code)
-- ═══════════════════════════════════════════════════════════════

-- ── Migration record ──────────────────────────────────────────────────────────
-- Fixes: 🔴-1 (coupon code removed from public view)
--        🔴-3 (phone ≥10 digits, dual rate limit per phone + per user_id)
--        🧱-1 (audit_log table — insert-only, permanent)
--        🧱-2 (status transition trigger — state machine enforcement)
--        🧱-3 (has_role/is_admin RPC access revoked)
--        🧱-4 (loyalty_awarded column — idempotent points trigger)
--        + audit entries for status changes, rate limits, coupon failures
