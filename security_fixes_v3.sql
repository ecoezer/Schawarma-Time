-- =============================================
-- SMASH47 — Security Fixes v3
-- Server-side order price validation via RPC
-- Run in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION create_order_secure(
  p_order_number TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_delivery_address TEXT,
  p_items JSONB,
  p_coupon_code TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL,
  p_estimated_delivery_time INT DEFAULT 35
) RETURNS TEXT AS $$
DECLARE
  v_item JSONB;
  v_product products%ROWTYPE;
  v_subtotal DECIMAL := 0;
  v_delivery_fee DECIMAL;
  v_min_order DECIMAL;
  v_discount DECIMAL := 0;
  v_total DECIMAL;
  v_coupon coupons%ROWTYPE;
  v_order_id UUID;
  v_items_validated JSONB := '[]'::JSONB;
  v_unit_price DECIMAL;
BEGIN
  -- ── 1. Auth check ──────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- ── 2. Validate items & recalculate subtotal from DB prices ────────────────
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'quantity')::INT <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_item->>'product_id';
    END IF;

    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_item->>'product_id';
    END IF;

    v_unit_price := v_product.price;
    v_subtotal   := v_subtotal + (v_unit_price * (v_item->>'quantity')::INT);

    v_items_validated := v_items_validated || jsonb_build_array(
      jsonb_build_object(
        'product_id',   v_product.id,
        'product_name', v_product.name,
        'quantity',     (v_item->>'quantity')::INT,
        'unit_price',   v_unit_price,
        'subtotal',     v_unit_price * (v_item->>'quantity')::INT,
        'extras',       COALESCE(v_item->'extras', '[]'::JSONB),
        'note',         COALESCE(v_item->>'note', '')
      )
    );
  END LOOP;

  -- ── 3. Get delivery fee & min order from restaurant_settings (never client)
  SELECT delivery_fee, min_order_amount
    INTO v_delivery_fee, v_min_order
    FROM restaurant_settings
    LIMIT 1;

  -- ── 4. Enforce minimum order amount ────────────────────────────────────────
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%',
      v_min_order, v_subtotal;
  END IF;

  -- ── 5. Validate & apply coupon server-side ─────────────────────────────────
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(p_coupon_code)
      AND is_active = TRUE
      FOR UPDATE; -- row lock → prevents race condition

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
      RAISE EXCEPTION 'Coupon has expired';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon max uses exceeded';
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
        RAISE EXCEPTION 'This coupon is valid for first order only';
      END IF;
    END IF;

    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage'
        THEN ROUND((v_subtotal * v_coupon.discount_value / 100)::NUMERIC, 2)
      ELSE v_coupon.discount_value
    END;

    -- Discount cannot exceed subtotal
    IF v_discount > v_subtotal THEN
      v_discount := v_subtotal;
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- ── 6. Calculate final total server-side ───────────────────────────────────
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);

  IF v_total < 0 THEN
    RAISE EXCEPTION 'Invalid order total: cannot be negative';
  END IF;

  -- ── 7. Insert order with server-calculated prices ──────────────────────────
  INSERT INTO orders (
    order_number,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    items,
    subtotal,
    delivery_fee,
    discount_amount,
    coupon_code,
    total,
    payment_method,
    estimated_delivery_time,
    notes,
    status
  ) VALUES (
    p_order_number,
    auth.uid(),            -- always server-side, never client
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_address,
    v_items_validated,     -- DB-validated items with real prices
    v_subtotal,            -- recalculated from DB
    v_delivery_fee,        -- from restaurant_settings
    v_discount,            -- server-side coupon calculation
    NULLIF(UPPER(p_coupon_code), ''),
    v_total,               -- server-side total
    p_payment_method,
    p_estimated_delivery_time,
    p_notes,
    'pending'
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Block direct INSERT on orders — only RPC allowed now ─────────────────────
DROP POLICY IF EXISTS "Authenticated users insert orders" ON orders;
CREATE POLICY "No direct order insert" ON orders
  FOR INSERT WITH CHECK (FALSE);
-- create_order_secure() uses SECURITY DEFINER → bypasses RLS correctly
