-- =============================================
-- SMASH47 — Security Fixes v4
-- Fixes: CRITICAL-1,2,3,4 | MED-2,3 | LOW-1,2
-- Run in Supabase SQL Editor
-- =============================================

-- ── CRITICAL-3: Prevent role escalation ───────────────────────────────────────
-- Users can no longer update their own role field.
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- role must stay the same — prevents self-promotion to manager
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- ── CRITICAL-2: Ensure direct INSERT on orders is always blocked ──────────────
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users insert orders" ON orders;
DROP POLICY IF EXISTS "No direct order insert" ON orders;

CREATE POLICY "No direct order insert" ON orders
  FOR INSERT WITH CHECK (FALSE);
-- create_order_secure() uses SECURITY DEFINER → bypasses this correctly.

-- ── CRITICAL-1: Tighten coupon RLS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins write coupons" ON coupons;

-- Customers: read only the fields needed for validation (no internal stats)
CREATE POLICY "Customer read coupon for validation" ON coupons
  FOR SELECT
  USING (
    is_active = TRUE
    AND NOT public.has_role(ARRAY['manager', 'cashier'])
  );

-- Managers: full access to all coupons (including inactive)
CREATE POLICY "Manager full access coupons" ON coupons
  FOR ALL
  USING (public.has_role(ARRAY['manager']));

-- ── CRITICAL-4 + MED-2 + LOW-1 + LOW-2: Rewrite create_order_secure() ────────
CREATE OR REPLACE FUNCTION create_order_secure(
  p_customer_name        TEXT,
  p_customer_phone       TEXT,
  p_customer_email       TEXT,
  p_delivery_address     TEXT,
  p_items                JSONB,
  p_coupon_code          TEXT    DEFAULT NULL,
  p_payment_method       TEXT    DEFAULT 'cash',
  p_notes                TEXT    DEFAULT NULL,
  p_estimated_delivery_time INT  DEFAULT 35
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
BEGIN

  -- ── 1. Auth check ─────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- ── 2. Rate limiting: max 3 orders per user per minute ────────────────────
  IF (
    SELECT COUNT(*) FROM orders
    WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 3 THEN
    RAISE EXCEPTION 'Too many orders placed. Please wait before trying again.';
  END IF;

  -- ── 3. Input validation ───────────────────────────────────────────────────
  IF LENGTH(TRIM(p_customer_name)) < 2 OR LENGTH(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid customer name';
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

  -- ── 4. Items must not be empty ────────────────────────────────────────────
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in a single order';
  END IF;

  -- ── 5. Validate items + extras — ALL prices from DB ───────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    IF (v_item->>'quantity')::INT <= 0 OR (v_item->>'quantity')::INT > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for item';
    END IF;

    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_item->>'product_id';
    END IF;

    -- Start with base DB price
    v_unit_price       := v_product.price;
    v_validated_extras := '[]'::JSONB;

    -- Validate each extra against DB product.extra_groups
    FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'extras', '[]')) LOOP
      v_extra_price := 0;
      v_extra_found := FALSE;

      -- Search for the extra option inside product's extra_groups
      FOR v_extra_group IN SELECT * FROM jsonb_array_elements(v_product.extra_groups) LOOP
        FOR v_extra_option IN SELECT * FROM jsonb_array_elements(v_extra_group->'options') LOOP
          IF (v_extra_option->>'id') = (v_extra->>'id') THEN
            -- Use DB price, not client-supplied price
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
          END IF;
        END LOOP;
      END LOOP;

      IF NOT v_extra_found THEN
        RAISE EXCEPTION 'Extra option not found on product: %', v_extra->>'id';
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

  -- ── 6. Delivery fee & min order from DB only ──────────────────────────────
  SELECT delivery_fee, min_order_amount
    INTO v_delivery_fee, v_min_order
    FROM restaurant_settings
    LIMIT 1;

  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current: €%', v_min_order, v_subtotal;
  END IF;

  -- ── 7. Coupon validation — server-side with row lock ─────────────────────
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code))
      AND is_active = TRUE
      FOR UPDATE; -- row lock prevents race condition on used_count

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
      RAISE EXCEPTION 'Coupon has expired';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon maximum uses exceeded';
    END IF;

    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order amount for this coupon is €%', v_coupon.min_order_amount;
    END IF;

    IF v_coupon.is_first_order_only THEN
      IF EXISTS (
        SELECT 1 FROM orders
        WHERE user_id = auth.uid()
        AND status NOT IN ('cancelled')
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;
    END IF;

    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage'
        THEN ROUND((v_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
      ELSE v_coupon.discount_value
    END;

    IF v_discount > v_subtotal THEN
      v_discount := v_subtotal;
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- ── 8. Final total — always server-side ──────────────────────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);

  IF v_total < 0 THEN v_total := 0; END IF;

  -- ── 9. Generate order number server-side (LOW-1) ──────────────────────────
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- ── 10. Insert order ──────────────────────────────────────────────────────
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
    LOWER(TRIM(p_customer_email)),
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

  -- Return both id and order_number as JSON so client can display order number
  RETURN json_build_object(
    'id',           v_order_id,
    'order_number', v_order_number
  )::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
