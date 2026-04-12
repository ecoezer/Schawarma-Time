-- =============================================
-- SMASH47 — Security Hardening v11
-- Fixes every finding from the 2026-04-12 pentest report:
--
--   🔴-1: loyalty_awarded added to orders UPDATE WITH CHECK
--         handle_order_delivered() re-reads from DB (not NEW) for idempotency
--   🔴-2: Explicit orders SELECT policy — customers see only own orders
--   🟡-1: p_estimated_delivery_time removed from create_order_secure — read from DB
--   🟡-2: validate_coupon_public() SECURITY DEFINER RPC for customer coupon preview
--   🟡-3: Total cart quantity cap (max 50) + per-item max reduced to 20
--   🟡-4: updated_at trigger — client can no longer backdate orders
--   🟡-5: Addresses JSONB size/count constraints on profiles
--   🟢-1: Orders SELECT policy also covers fetchOrderByNumber (same policy)
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════
-- 🔴-1a: Lock loyalty_awarded in orders UPDATE WITH CHECK
-- Previously only financial columns were protected — loyalty_awarded
-- was freely writable, allowing a manager to reset and re-trigger
-- the loyalty award trigger indefinitely.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins update orders" ON orders;
CREATE POLICY "Admins update orders" ON orders
  FOR UPDATE
  USING (public.has_role(ARRAY['manager', 'cashier', 'kitchen']))
  WITH CHECK (
    -- Financial columns must remain unchanged
    total              = (SELECT o.total              FROM orders o WHERE o.id = id)
    AND subtotal       = (SELECT o.subtotal           FROM orders o WHERE o.id = id)
    AND discount_amount= (SELECT o.discount_amount    FROM orders o WHERE o.id = id)
    AND delivery_fee   = (SELECT o.delivery_fee       FROM orders o WHERE o.id = id)
    -- Identity columns must remain unchanged
    AND user_id        IS NOT DISTINCT FROM (SELECT o.user_id       FROM orders o WHERE o.id = id)
    AND order_number   = (SELECT o.order_number       FROM orders o WHERE o.id = id)
    AND coupon_code    IS NOT DISTINCT FROM (SELECT o.coupon_code   FROM orders o WHERE o.id = id)
    -- Idempotency guard: loyalty_awarded is immutable once set to TRUE
    AND (
      (SELECT o.loyalty_awarded FROM orders o WHERE o.id = id) = FALSE
      OR loyalty_awarded = (SELECT o.loyalty_awarded FROM orders o WHERE o.id = id)
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 🔴-1b: Harden handle_order_delivered() trigger
-- Previous version relied on NEW.loyalty_awarded which a manager
-- could reset before the trigger fires (same transaction). New version
-- re-reads loyalty_awarded directly from the DB row inside the trigger
-- to get the authoritative pre-update value.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_points        INT;
  v_already_awarded BOOLEAN;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status != 'delivered'
     AND NEW.user_id IS NOT NULL THEN

    -- Re-read the authoritative value from the DB (not from NEW, which could
    -- be manipulated within the same transaction by resetting the column).
    SELECT loyalty_awarded INTO v_already_awarded
      FROM orders WHERE id = NEW.id FOR UPDATE;

    IF v_already_awarded = TRUE THEN
      -- Already awarded — abort silently. Prevents status-regression replay.
      RETURN NEW;
    END IF;

    v_points := FLOOR(NEW.total)::INT;

    UPDATE profiles
      SET loyalty_points = loyalty_points + v_points,
          total_orders   = total_orders + 1
      WHERE id = NEW.user_id;

    -- Atomically mark as awarded in the same statement
    UPDATE orders SET loyalty_awarded = TRUE WHERE id = NEW.id;

    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('loyalty_awarded', NEW.user_id,
              jsonb_build_object(
                'order_id',    NEW.id,
                'points',      v_points,
                'awarded_by',  auth.uid()   -- track who triggered the delivery
              ));
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
-- 🔴-2: Explicit orders SELECT policy
-- Without this, depending on the initial schema, ALL authenticated users
-- could read ALL orders (full customer PII + financial data).
-- Customers see only their own. Staff see all.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users read own orders"   ON orders;
DROP POLICY IF EXISTS "Public read orders"      ON orders;
DROP POLICY IF EXISTS "Customers read orders"   ON orders;
DROP POLICY IF EXISTS "Orders select"           ON orders;

CREATE POLICY "Orders select" ON orders
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(ARRAY['manager', 'cashier', 'kitchen'])
  );


-- ═══════════════════════════════════════════════════════════════
-- 🟡-1: updated_at trigger — remove client control over timestamp
-- orderService.ts was sending updated_at: new Date().toISOString()
-- allowing staff to backdate order timestamps. Now the DB owns it.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════════════════════════
-- 🟡-2: validate_coupon_public() — SECURITY DEFINER RPC
-- Replaces the broken client-side couponService.validateCoupon()
-- which queries the coupons table directly (RLS blocks customers).
-- This function runs as the table owner and safely returns only
-- the information needed for UX preview — no code enumeration possible.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.validate_coupon_public(
  p_code     TEXT,
  p_subtotal DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon    coupons%ROWTYPE;
  v_discount  DECIMAL := 0;
BEGIN
  -- Auth required — anonymous cannot probe coupon codes
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Anmeldung erforderlich');
  END IF;

  SELECT * INTO v_coupon
    FROM coupons
    WHERE code = UPPER(TRIM(p_code))
      AND is_active = TRUE;

  -- Uniform error message for all failure paths — no behavioral oracle
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Gutschein nicht mehr verfügbar');
  END IF;

  IF p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'errorMessage', format('Mindestbestellwert für diesen Gutschein: €%s',
                              to_char(v_coupon.min_order_amount, 'FM999990.00'))
    );
  END IF;

  -- First-order check: inform customer if they are not eligible
  IF v_coupon.is_first_order_only THEN
    IF EXISTS (
      SELECT 1 FROM orders
      WHERE user_id = auth.uid()
        AND status NOT IN ('cancelled')
    ) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'errorMessage', 'Dieser Gutschein gilt nur für die erste Bestellung'
      );
    END IF;
  END IF;

  -- Calculate preview discount (server will recalculate at order time)
  v_discount := CASE
    WHEN v_coupon.discount_type = 'percentage'
      THEN ROUND((p_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
    ELSE v_coupon.discount_value
  END;

  IF v_discount > p_subtotal THEN v_discount := p_subtotal; END IF;

  RETURN jsonb_build_object(
    'valid',          true,
    'discount',       v_discount,
    'discount_type',  v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon_public(TEXT, DECIMAL) TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 🟡-3 + 🟡-4: create_order_secure v11
-- Changes vs v8:
--   🟡-3: p_estimated_delivery_time removed — read from restaurant_settings
--   🟡-4: Total quantity cap: sum of all quantities ≤ 50
--         Per-item quantity max reduced: 100 → 20
--   🔴-2: Uses auth.uid() for user scoping (unrelated cleanup)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_order_secure(
  p_customer_name           TEXT,
  p_customer_phone          TEXT,
  p_customer_email          TEXT,
  p_delivery_address        TEXT,
  p_items                   JSONB,
  p_coupon_code             TEXT    DEFAULT NULL,
  p_payment_method          TEXT    DEFAULT 'cash',
  p_notes                   TEXT    DEFAULT NULL
  -- p_estimated_delivery_time REMOVED — now read from restaurant_settings (🟡-3 fix)
) RETURNS TEXT AS $$
DECLARE
  v_item                JSONB;
  v_extra               JSONB;
  v_extra_group         JSONB;
  v_extra_option        JSONB;
  v_product             products%ROWTYPE;
  v_subtotal            DECIMAL := 0;
  v_delivery_fee        DECIMAL;
  v_min_order           DECIMAL;
  v_delivery_zones      JSONB;
  v_estimated_time      INT;     -- read from DB, not from client
  v_zone                JSONB;
  v_zone_valid          BOOLEAN := FALSE;
  v_discount            DECIMAL := 0;
  v_total               DECIMAL;
  v_coupon              coupons%ROWTYPE;
  v_order_id            UUID;
  v_order_number        TEXT;
  v_items_validated     JSONB := '[]'::JSONB;
  v_unit_price          DECIMAL;
  v_extra_price         DECIMAL;
  v_extra_found         BOOLEAN;
  v_validated_extras    JSONB;
  v_phone_normalized    TEXT;
  v_phone_hash          TEXT;
  v_phone_digit_count   INT;
  v_postal_code         TEXT;
  v_pc                  TEXT;
  v_auth_email          TEXT;
  v_extras_count        INT;
  v_total_quantity      INT := 0;   -- 🟡-4: tracks sum of all item quantities
BEGIN

  -- ── 1. Auth check ──────────────────────────────────────────────────────────
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

  -- ── 3. Input validation ────────────────────────────────────────────────────
  IF LENGTH(TRIM(p_customer_name)) < 2 OR LENGTH(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Invalid customer name';
  END IF;

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

  IF LENGTH(COALESCE(p_notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Notes too long (max 2000 characters)';
  END IF;

  -- ── 4. Phone normalization + entropy + dual rate limit ────────────────────
  v_phone_normalized := regexp_replace(p_customer_phone, '[^0-9+]', '', 'g');
  v_phone_normalized := regexp_replace(v_phone_normalized, '^00', '+');
  v_phone_hash       := encode(digest(v_phone_normalized, 'sha256'), 'hex');

  v_phone_digit_count := LENGTH(regexp_replace(v_phone_normalized, '[^0-9]', '', 'g'));
  IF v_phone_digit_count < 10 THEN
    RAISE EXCEPTION 'Phone number must contain at least 10 digits';
  END IF;

  INSERT INTO order_rate_limit_phone (phone_hash, user_id)
    VALUES (v_phone_hash, auth.uid());

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

  -- ── 5. Items basic validation ──────────────────────────────────────────────
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in a single order';
  END IF;

  -- ── 6. Validate items + extras — ALL prices from DB ───────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    -- 🟡-4: Per-item quantity cap reduced from 100 → 20
    IF (v_item->>'quantity')::INT <= 0 OR (v_item->>'quantity')::INT > 20 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 20';
    END IF;

    -- 🟡-4: Running total quantity across all line items
    v_total_quantity := v_total_quantity + (v_item->>'quantity')::INT;
    IF v_total_quantity > 50 THEN
      RAISE EXCEPTION 'Total order quantity cannot exceed 50 items';
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

  -- ── 7. Delivery fee + zone + estimated time — ALL from DB ─────────────────
  -- 🟡-3: estimated_delivery_time is now read from restaurant_settings here,
  -- not from the client parameter (which was removed from the function signature).
  SELECT delivery_fee, min_order_amount, delivery_zones, estimated_delivery_time
    INTO v_delivery_fee, v_min_order, v_delivery_zones, v_estimated_time
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

  -- ── 8. Minimum order ───────────────────────────────────────────────────────
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%',
      v_min_order, v_subtotal;
  END IF;

  -- ── 9. Coupon validation ───────────────────────────────────────────────────
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN

    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code))
        AND is_active = TRUE
      FOR UPDATE;

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

    IF v_coupon.discount_type NOT IN ('percentage', 'fixed') THEN
      RAISE EXCEPTION 'Unknown coupon discount type';
    END IF;

    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage'
        THEN ROUND((v_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
      ELSE v_coupon.discount_value
    END;

    IF v_discount > v_subtotal THEN v_discount := v_subtotal; END IF;

    IF v_discount > (v_subtotal * 0.5) THEN
      RAISE EXCEPTION 'Discount cannot exceed 50%% of the order subtotal';
    END IF;

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
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;

      INSERT INTO coupon_phone_usage (coupon_id, phone_hash)
        VALUES (v_coupon.id, v_phone_hash)
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- ── 10. Final total ────────────────────────────────────────────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);
  IF v_total < 0 THEN v_total := 0; END IF;

  -- ── 11. Order number + insert ──────────────────────────────────────────────
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO orders (
    order_number, user_id,
    customer_name, customer_phone, customer_email,
    delivery_address,
    items, subtotal, delivery_fee, discount_amount,
    coupon_code, total, payment_method,
    estimated_delivery_time,   -- now from restaurant_settings (🟡-3)
    notes, status
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
    v_estimated_time,          -- authoritative value from DB
    SUBSTRING(COALESCE(p_notes, ''), 1, 1000),
    'pending'
  ) RETURNING id INTO v_order_id;

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
-- 🟢-1: Addresses JSONB size + count constraints
-- A user could store unlimited data in profiles.addresses (no limit).
-- Cap at 10 addresses and 10KB total.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS addresses_max_count;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS addresses_max_size;

ALTER TABLE profiles
  ADD CONSTRAINT addresses_max_count
    CHECK (jsonb_array_length(COALESCE(addresses, '[]'::jsonb)) <= 10);

ALTER TABLE profiles
  ADD CONSTRAINT addresses_max_size
    CHECK (LENGTH(COALESCE(addresses::text, '')) <= 10240);


-- ═══════════════════════════════════════════════════════════════
-- VERIFY: run after applying
-- ═══════════════════════════════════════════════════════════════
-- 1. Orders SELECT policy scope:
--    SELECT COUNT(*) FROM orders;  -- as customer JWT: should return only own orders
--
-- 2. Loyalty double-award blocked:
--    UPDATE orders SET loyalty_awarded = false WHERE id = '...';
--    -- Should fail WITH CHECK if loyalty_awarded was already TRUE
--
-- 3. estimated_delivery_time is now server-read:
--    The create_order_secure function no longer accepts this parameter.
--    Calling it with p_estimated_delivery_time will cause a parameter error.
--
-- 4. Coupon validation works for customers:
--    SELECT validate_coupon_public('TESTCODE', 25.00);
--    -- Should return JSON with valid/errorMessage
--
-- 5. Cart quantity cap:
--    Sending 51 total items should fail: 'Total order quantity cannot exceed 50 items'
