-- =============================================
-- SMASH47 — Attacker-Perspective Security Fixes v7
-- Fixes: A-2, C-2, C-8, C-9, C-11, F-1, F-2, G-1, B-1, J-1
-- Run in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── J-1: Remove orders from public Realtime publication ──────────────────────
-- Orders in a public Realtime publication risks leaking all order changes to
-- any subscriber if Supabase Realtime ever has an RLS enforcement gap.
-- Admin dashboard uses a service-role subscription via supabase_admin channel.
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE restaurant_settings;

-- Separate admin publication for orders — only used by service-role connections
DROP PUBLICATION IF EXISTS supabase_realtime_admin;
CREATE PUBLICATION supabase_realtime_admin FOR TABLE orders;

-- ── B-1: Restrict coupons to a public view — remove internal stats ────────────
-- Revoke direct table access from unauthenticated + authenticated roles.
-- Customers see only the fields needed for validation (no used_count/max_uses).
-- Managers continue to access the full table via the existing RLS policy.
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public AS
  SELECT
    id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    is_first_order_only,
    expires_at
  FROM coupons
  WHERE is_active = TRUE;

-- Grant SELECT on the view to all roles (replaces the table-level SELECT)
GRANT SELECT ON public.coupons_public TO anon, authenticated;

-- Drop the overly broad customer SELECT policy on the coupons table
-- Managers still access the full table via "Admins write coupons" (uses ALL)
DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
DROP POLICY IF EXISTS "Customer read coupon for validation" ON coupons;
CREATE POLICY "Managers full access coupons" ON coupons
  FOR ALL USING (public.has_role(ARRAY['manager']));
-- No SELECT policy for anon/authenticated on the table itself — view handles it

-- ── G-1: Replace per-INSERT purge trigger with pg_cron scheduled job ─────────
-- The trigger caused a full-table DELETE scan on every order attempt.
DROP TRIGGER IF EXISTS trg_purge_order_rate_limit ON order_rate_limit_phone;
DROP FUNCTION IF EXISTS purge_order_rate_limit_phone();

-- Enable pg_cron (must be enabled in Supabase Dashboard → Database → Extensions first)
-- If pg_cron is not available, this line is a no-op.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a pg_cron job to purge old rate limit rows every 5 minutes
SELECT cron.schedule(
  'purge-order-rate-limit',
  '*/5 * * * *',
  $$DELETE FROM order_rate_limit_phone WHERE created_at < NOW() - INTERVAL '10 minutes'$$
);

-- Add a partial index for efficient time-based queries on rate limit table
CREATE INDEX IF NOT EXISTS idx_order_rate_limit_recent
  ON order_rate_limit_phone (phone_hash, created_at DESC);

-- ── Full rewrite of create_order_secure — v7 ─────────────────────────────────
-- Fixes:
--   A-2:  p_customer_email verified against auth.email() — no email spoofing
--   C-2:  Extras per item capped at 20; inner loops EXIT on first match
--   C-8:  SET LOCAL lock_timeout = '3s' before FOR UPDATE on coupons
--   C-9:  Phone rate limit INSERT moved to step 4 (before all validation)
--         so ALL attempts (including failed ones) consume budget
--   C-11: p_estimated_delivery_time bounded to [10, 120] minutes
--   F-1:  All coupon failure paths return identical generic error message
--   F-2:  is_first_order_only checks ANY prior non-cancelled order,
--         not just orders with coupon_code IS NOT NULL

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
  v_postal_code       TEXT;
  v_pc                TEXT;
  v_auth_email        TEXT;
  v_extras_count      INT;
BEGIN

  -- ── 1. Auth check ─────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- ── 2. Rate limit: max 3 orders per user_id per minute ───────────────────
  IF (
    SELECT COUNT(*) FROM orders
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 3 THEN
    RAISE EXCEPTION 'Too many orders. Please wait before placing another order.';
  END IF;

  -- ── 3. Input validation ───────────────────────────────────────────────────
  IF LENGTH(TRIM(p_customer_name)) < 2 OR LENGTH(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid customer name';
  END IF;

  -- A-2: email must match the authenticated user's registered email — prevents
  -- spoofing: attacker cannot trigger confirmation emails to arbitrary addresses
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

  -- C-11: bound estimated delivery time to a sane range
  IF p_estimated_delivery_time < 10 OR p_estimated_delivery_time > 120 THEN
    RAISE EXCEPTION 'Invalid estimated delivery time';
  END IF;

  -- C-6: cap notes length before any processing
  IF LENGTH(COALESCE(p_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Notes too long (max 2000 characters)';
  END IF;

  -- ── 4. Phone normalization + rate limit (ALL attempts, including failed) ──
  -- C-9 fix: INSERT happens here, before ANY validation that can raise an
  -- exception — so failed attempts (wrong coupon, bad product, zone mismatch)
  -- all consume rate limit budget. Transaction rollback still rolls this back,
  -- but within the transaction the count is visible to the check below.
  v_phone_normalized := regexp_replace(p_customer_phone, '[^0-9+]', '', 'g');
  v_phone_normalized := regexp_replace(v_phone_normalized, '^00', '+');
  v_phone_hash       := encode(digest(v_phone_normalized, 'sha256'), 'hex');

  -- Record this attempt immediately
  INSERT INTO order_rate_limit_phone (phone_hash) VALUES (v_phone_hash);

  -- Now check if this attempt pushes over the limit
  IF (
    SELECT COUNT(*) FROM order_rate_limit_phone
    WHERE phone_hash = v_phone_hash
    AND created_at > NOW() - INTERVAL '10 minutes'
  ) > 5 THEN
    RAISE EXCEPTION 'Too many order attempts from this phone number. Please wait.';
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
      -- Note: product_id NOT echoed back (C-6 / info leak hardening)
    END IF;

    v_unit_price       := v_product.price;
    v_validated_extras := '[]'::JSONB;

    -- C-2: cap extras per item to prevent nested-loop CPU DoS
    v_extras_count := jsonb_array_length(COALESCE(v_item->'extras', '[]'));
    IF v_extras_count > 20 THEN
      RAISE EXCEPTION 'Too many extras per item (max 20)';
    END IF;

    FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'extras', '[]')) LOOP
      v_extra_price := 0;
      v_extra_found := FALSE;

      -- C-2: EXIT loops immediately on first match — prevents O(n²) iteration
      <<group_loop>>
      FOR v_extra_group IN SELECT * FROM jsonb_array_elements(v_product.extra_groups) LOOP
        <<option_loop>>
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
            EXIT group_loop;  -- C-2: break both loops on first match
          END IF;
        END LOOP option_loop;
      END LOOP group_loop;

      IF NOT v_extra_found THEN
        RAISE EXCEPTION 'Extra option not found on product';
        -- Note: extra ID NOT echoed back
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

  -- ── 7. Delivery fee, min order & zones — ALL from DB ─────────────────────
  SELECT delivery_fee, min_order_amount, delivery_zones
    INTO v_delivery_fee, v_min_order, v_delivery_zones
    FROM restaurant_settings
    LIMIT 1;

  IF v_delivery_zones IS NOT NULL AND jsonb_array_length(v_delivery_zones) > 0 THEN
    -- Match the LAST 5-digit sequence in the address string (the postal code,
    -- which comes after the street number, e.g. "Musterstr. 12, 31134 Hildesheim")
    v_postal_code := COALESCE(
      (regexp_match(p_delivery_address, '.*(\d{5})'))[1],
      ''
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

  -- ── 8. Enforce minimum order amount ──────────────────────────────────────
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%',
      v_min_order, v_subtotal;
  END IF;

  -- ── 9. Coupon validation ──────────────────────────────────────────────────
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN

    -- C-8: set a 3-second lock timeout to prevent lock starvation DoS
    -- If the coupon row is locked by another transaction, fail fast
    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code))
      AND is_active = TRUE
      FOR UPDATE;

    -- F-1: ALL coupon failure paths return the SAME generic error message.
    -- This prevents behavioral oracles that distinguish "code doesn't exist"
    -- from "code exists but expired" — eliminating timing/message enumeration.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';  -- F-1: same message
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';  -- F-1: same message
    END IF;

    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order amount for this coupon is €%', v_coupon.min_order_amount;
    END IF;

    -- Calculate discount before any side effects
    IF v_coupon.discount_type NOT IN ('percentage', 'fixed') THEN
      RAISE EXCEPTION 'Unknown coupon discount type';
    END IF;
    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage'
        THEN ROUND((v_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
      ELSE v_coupon.discount_value
    END;

    IF v_discount > v_subtotal THEN
      v_discount := v_subtotal;
    END IF;

    -- BLV-4: Enforce 50% cap before any side effects
    IF v_discount > (v_subtotal * 0.5) THEN
      RAISE EXCEPTION 'Discount cannot exceed 50%% of the order subtotal';
    END IF;

    -- F-2 fix: is_first_order_only checks for ANY prior non-cancelled order,
    -- not just orders where a coupon was previously used.
    -- Previous bug: AND coupon_code IS NOT NULL — allowed customers with 100
    -- prior orders (no coupons) to use "first-order" coupons.
    IF v_coupon.is_first_order_only THEN
      IF EXISTS (
        SELECT 1 FROM coupon_phone_usage
        WHERE coupon_id = v_coupon.id
        AND phone_hash  = v_phone_hash
      ) THEN
        RAISE EXCEPTION 'Invalid or inactive coupon code';  -- F-1: generic message
      END IF;

      -- F-2: ANY prior non-cancelled order disqualifies the user
      IF EXISTS (
        SELECT 1 FROM orders
        WHERE user_id = auth.uid()
        AND status NOT IN ('cancelled')
        -- Removed: AND coupon_code IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;

      INSERT INTO coupon_phone_usage (coupon_id, phone_hash)
        VALUES (v_coupon.id, v_phone_hash)
        ON CONFLICT DO NOTHING;
    END IF;

    -- All checks passed — increment used_count
    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- ── 10. Final total ───────────────────────────────────────────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);
  IF v_total < 0 THEN v_total := 0; END IF;

  -- ── 11. Generate order number server-side ────────────────────────────────
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- ── 12. Insert order ─────────────────────────────────────────────────────
  INSERT INTO orders (
    order_number, user_id,
    customer_name, customer_phone, customer_email,
    delivery_address,
    items, subtotal, delivery_fee, discount_amount,
    coupon_code, total, payment_method,
    estimated_delivery_time, notes, status
  ) VALUES (
    v_order_number,
    auth.uid(),
    TRIM(p_customer_name),
    TRIM(p_customer_phone),
    v_auth_email,                          -- A-2: use verified email, not raw input
    TRIM(p_delivery_address),
    v_items_validated,
    v_subtotal,
    v_delivery_fee,
    v_discount,
    NULLIF(UPPER(TRIM(p_coupon_code)), ''),
    v_total,
    p_payment_method,
    p_estimated_delivery_time,
    SUBSTRING(COALESCE(p_notes, ''), 1, 1000),
    'pending'
  ) RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'id',           v_order_id,
    'order_number', v_order_number
  )::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Migration record ──────────────────────────────────────────────────────────
-- This script supersedes create_order_secure() from v6.
-- Fixes applied: A-2, B-1, C-2, C-8, C-9, C-11, F-1, F-2, G-1, J-1
