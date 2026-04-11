-- =============================================
-- SMASH47 — Business Logic Security Fixes v5
-- Fixes: BLV-1, BLV-2, BLV-3, BLV-4, BLV-6
-- Run in Supabase SQL Editor
-- =============================================

-- ── BLV-1 + BLV-3: coupon_phone_usage table ──────────────────────────────────
-- Tracks coupon use per phone hash to prevent multi-account abuse.
CREATE TABLE IF NOT EXISTS coupon_phone_usage (
  coupon_id  UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL,  -- SHA256(normalized_phone) — raw phone never stored
  used_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (coupon_id, phone_hash)
);

ALTER TABLE coupon_phone_usage ENABLE ROW LEVEL SECURITY;
-- Only accessible via SECURITY DEFINER functions — no direct client access
CREATE POLICY "No direct access" ON coupon_phone_usage
  FOR ALL USING (FALSE);

-- ── BLV-3: Trigger — refund used_count when order is cancelled ────────────────
CREATE OR REPLACE FUNCTION handle_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status != 'cancelled'
     AND OLD.coupon_code IS NOT NULL THEN

    -- Decrement used_count (never below 0)
    UPDATE coupons
      SET used_count = GREATEST(used_count - 1, 0)
      WHERE code = OLD.coupon_code;

    -- Remove phone usage record so the user cannot abuse cancel→reuse loop
    -- We keep it intentionally to prevent re-use after cancellation.
    -- (Do NOT delete from coupon_phone_usage on cancel)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_cancelled ON orders;
CREATE TRIGGER on_order_cancelled
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION handle_order_cancellation();

-- ── BLV-6: Trigger — award loyalty points on delivery ────────────────────────
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_points INT;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status != 'delivered'
     AND NEW.user_id IS NOT NULL THEN

    -- 1 point per 1€ of total (floor)
    v_points := FLOOR(NEW.total)::INT;

    UPDATE profiles
      SET loyalty_points = loyalty_points + v_points,
          total_orders   = total_orders + 1
      WHERE id = NEW.user_id;
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

-- ── BLV-1 + BLV-2 + BLV-3 + BLV-4: Full rewrite of create_order_secure() ────
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
BEGIN

  -- ── 1. Auth check ─────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- ── 2. Rate limiting: max 3 orders per user per minute ───────────────────
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

  -- ── 4. Items validation ───────────────────────────────────────────────────
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in a single order';
  END IF;

  -- ── 5. Validate items + extras — ALL prices from DB ──────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    IF (v_item->>'quantity')::INT <= 0 OR (v_item->>'quantity')::INT > 100 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_item->>'product_id';
    END IF;

    v_unit_price       := v_product.price;
    v_validated_extras := '[]'::JSONB;

    FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'extras', '[]')) LOOP
      v_extra_price := 0;
      v_extra_found := FALSE;

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

  -- ── 6. Delivery fee, min order & zones — ALL from DB (BLV-2) ─────────────
  SELECT delivery_fee, min_order_amount, delivery_zones
    INTO v_delivery_fee, v_min_order, v_delivery_zones
    FROM restaurant_settings
    LIMIT 1;

  -- BLV-2: Server-side delivery zone validation
  IF v_delivery_zones IS NOT NULL AND jsonb_array_length(v_delivery_zones) > 0 THEN

    -- Extract postal code from address (last sequence of 5 digits)
    v_postal_code := COALESCE(
      (regexp_match(p_delivery_address, '\d{5}'))[1],
      ''
    );

    FOR v_zone IN SELECT * FROM jsonb_array_elements(v_delivery_zones) LOOP
      -- Check postal_codes array
      IF v_zone ? 'postal_codes' THEN
        FOR v_pc IN SELECT * FROM jsonb_array_elements_text(v_zone->'postal_codes') LOOP
          IF v_postal_code = v_pc THEN
            v_zone_valid   := TRUE;
            v_delivery_fee := COALESCE((v_zone->>'delivery_fee')::DECIMAL, v_delivery_fee);
            v_min_order    := COALESCE((v_zone->>'min_order')::DECIMAL, v_min_order);
          END IF;
        END LOOP;
      END IF;
      -- Fallback: zone name contains postal code
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

  -- ── 7. Enforce minimum order amount ──────────────────────────────────────
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%',
      v_min_order, v_subtotal;
  END IF;

  -- ── 8. Coupon validation — server-side with row lock (BLV-1 + BLV-3) ─────
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN

    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code))
      AND is_active = TRUE
      FOR UPDATE;

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

    -- BLV-1: Phone-based first-order check (prevents multi-account abuse)
    IF v_coupon.is_first_order_only THEN
      -- Normalize phone: remove spaces, dashes, parens
      v_phone_normalized := regexp_replace(p_customer_phone, '[^0-9+]', '', 'g');
      v_phone_hash       := encode(digest(v_phone_normalized, 'sha256'), 'hex');

      -- Check phone hash in usage table (survives account deletion)
      IF EXISTS (
        SELECT 1 FROM coupon_phone_usage
        WHERE coupon_id = v_coupon.id
        AND phone_hash  = v_phone_hash
      ) THEN
        RAISE EXCEPTION 'This coupon has already been used from this phone number';
      END IF;

      -- Also check user_id for logged-in users
      IF EXISTS (
        SELECT 1 FROM orders
        WHERE user_id = auth.uid()
        AND status NOT IN ('cancelled')
        AND coupon_code IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;

      -- Record phone hash usage
      INSERT INTO coupon_phone_usage (coupon_id, phone_hash)
        VALUES (v_coupon.id, v_phone_hash)
        ON CONFLICT DO NOTHING;
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

  -- ── 9. Final total — server-side (BLV-4: net total guard) ────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);

  IF v_total < 0 THEN v_total := 0; END IF;

  -- BLV-4: Prevent deeply discounted orders that cause net loss
  -- Max discount = 50% of subtotal
  IF v_discount > (v_subtotal * 0.5) THEN
    RAISE EXCEPTION 'Discount cannot exceed 50%% of the order subtotal';
  END IF;

  -- ── 10. Generate order number server-side ─────────────────────────────────
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- ── 11. Insert order ──────────────────────────────────────────────────────
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

  RETURN json_build_object(
    'id',           v_order_id,
    'order_number', v_order_number
  )::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pgcrypto extension required for SHA256 phone hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;
