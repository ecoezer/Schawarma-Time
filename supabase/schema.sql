-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHAWARMA-TIME — Vollständiges Datenbankschema (v12, Stand: 2026-04-12)
-- ─────────────────────────────────────────────────────────────────────────────
-- Dieses Skript erstellt das gesamte Datenbankschema von Grund auf neu.
-- Es ersetzt alle security_fixes_vX.sql Dateien und die alte supabase_schema.sql.
--
-- VERWENDUNG:
--   Neues Supabase-Projekt → SQL Editor → diese Datei vollständig ausführen.
--   Danach seed.sql ausführen, um Produkte zu laden.
--
-- REIHENFOLGE:
--   1. Extensions
--   2. Tabellen
--   3. Hilfsfunktionen (has_role, is_admin)
--   4. Trigger-Funktionen
--   5. Trigger
--   6. RLS-Policies
--   7. Views
--   8. RPC-Funktionen (create_order_secure, validate_coupon_public)
--   9. Berechtigungen
--  10. Seed-Daten (Restaurant-Einstellungen, Kategorien, Demo-Coupons)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELLEN
-- ─────────────────────────────────────────────────────────────────────────────

-- ── restaurant_settings ──────────────────────────────────────────────────────
CREATE TABLE restaurant_settings (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT        NOT NULL DEFAULT 'Schawarma-Time',
  description           TEXT,
  address               TEXT        NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  logo_url              TEXT,
  hero_images           JSONB       DEFAULT '[]',
  rating                DECIMAL(3,2) DEFAULT 4.8,
  review_count          INT         DEFAULT 0,
  is_delivery_active    BOOLEAN     DEFAULT TRUE,
  delivery_fee          DECIMAL(10,2) DEFAULT 2.00,
  min_order_amount      DECIMAL(10,2) DEFAULT 15.00,
  estimated_delivery_time INT       DEFAULT 35,
  delivery_radius_km    DECIMAL(5,2) DEFAULT 5.0,
  delivery_zones        JSONB       DEFAULT '[]',
  hours                 JSONB       DEFAULT '{}',
  is_halal_certified    BOOLEAN     DEFAULT TRUE,
  announcement          TEXT,
  is_announcement_active BOOLEAN    DEFAULT FALSE,
  revenue_goal_daily    DECIMAL(10,2) DEFAULT 500.00,
  tags                  JSONB       DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── categories ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  position   INT     DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id  UUID    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  image_url    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  is_most_liked BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan     BOOLEAN DEFAULT FALSE,
  is_halal     BOOLEAN DEFAULT TRUE,
  allergens    JSONB   DEFAULT '[]',
  calories     INT,
  extra_groups JSONB   DEFAULT '[]',
  position     INT     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── profiles (erweitert auth.users) ──────────────────────────────────────────
CREATE TABLE profiles (
  id             UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT    NOT NULL,
  full_name      TEXT,
  phone          TEXT,
  birth_date     DATE,
  role           TEXT    NOT NULL DEFAULT 'customer'
                   CHECK (role IN ('customer', 'cashier', 'kitchen', 'manager')),
  addresses      JSONB   DEFAULT '[]'
                   CONSTRAINT addresses_max_count CHECK (jsonb_array_length(COALESCE(addresses, '[]'::jsonb)) <= 10)
                   CONSTRAINT addresses_max_size  CHECK (LENGTH(COALESCE(addresses::text, '')) <= 10240),
  loyalty_points INT     DEFAULT 0,
  total_orders   INT     DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                     UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number           TEXT    NOT NULL UNIQUE,
  user_id                UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name          TEXT    NOT NULL,
  customer_phone         TEXT    NOT NULL,
  customer_email         TEXT    NOT NULL,
  delivery_address       TEXT    NOT NULL,
  delivery_lat           DECIMAL(10,8),
  delivery_lng           DECIMAL(11,8),
  items                  JSONB   NOT NULL DEFAULT '[]',
  subtotal               DECIMAL(10,2) NOT NULL,
  delivery_fee           DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  discount_amount        DECIMAL(10,2) DEFAULT 0.00,
  coupon_code            TEXT,
  total                  DECIMAL(10,2) NOT NULL,
  status                 TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','confirmed','preparing','on_the_way','delivered','cancelled')),
  payment_method         TEXT    NOT NULL DEFAULT 'cash'
                           CHECK (payment_method IN ('cash','card_on_delivery')),
  estimated_delivery_time INT,
  notes                  TEXT,
  rejection_reason       TEXT,
  loyalty_awarded        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── coupons ──────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  code               TEXT    NOT NULL UNIQUE,
  discount_type      TEXT    NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value     DECIMAL(10,2) NOT NULL
                       CONSTRAINT coupons_discount_value_positive CHECK (discount_value > 0)
                       CONSTRAINT coupons_percentage_max          CHECK (discount_type != 'percentage' OR discount_value <= 100)
                       CONSTRAINT coupons_fixed_max               CHECK (discount_type != 'fixed'      OR discount_value <= 10000),
  min_order_amount   DECIMAL(10,2) DEFAULT 0
                       CONSTRAINT coupons_min_order_nonneg CHECK (min_order_amount >= 0),
  max_uses           INT,
  max_uses_per_user  INT     DEFAULT NULL
                       CHECK (max_uses_per_user IS NULL OR max_uses_per_user > 0),
  used_count         INT     DEFAULT 0,
  is_first_order_only BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── audit_log (insert-only, niemals gelöscht) ─────────────────────────────────
CREATE TABLE audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT        NOT NULL,
  user_id    UUID,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_type_time ON audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON audit_log (user_id, created_at DESC);

-- ── coupon_phone_usage (Erst-Bestellung-Prüfung per Telefonnummer-Hash) ───────
CREATE TABLE coupon_phone_usage (
  coupon_id  UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL,
  PRIMARY KEY (coupon_id, phone_hash)
);

-- ── coupon_user_usage (Pro-Benutzer-Limit-Tracking) ──────────────────────────
CREATE TABLE coupon_user_usage (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID        NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_id  UUID        REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS coupon_user_usage_coupon_user ON coupon_user_usage (coupon_id, user_id);

-- ── order_rate_limit_phone (TTL-Tabelle, wird alle 10 Min. bereinigt) ─────────
CREATE TABLE order_rate_limit_phone (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT        NOT NULL,
  user_id    UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_rate_limit_recent   ON order_rate_limit_phone (phone_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_rate_limit_user_time ON order_rate_limit_phone (user_id, created_at DESC);

-- Realtime
ALTER TABLE orders             REPLICA IDENTITY FULL;
ALTER TABLE restaurant_settings REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE orders, restaurant_settings;
 COMMIT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HILFSFUNKTIONEN
-- ─────────────────────────────────────────────────────────────────────────────

-- has_role: prüft ob der aktuelle Benutzer eine der angegebenen Rollen hat.
-- Wird intern von RLS-Policies genutzt — kein direkter RPC-Zugriff für Clients.
CREATE OR REPLACE FUNCTION public.has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY(required_roles)
  );
$$;

-- is_admin: Kurzform — true für manager, cashier, kitchen
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['manager', 'cashier', 'kitchen']);
$$;

-- Direkte RPC-Aufrufe durch Clients sperren (RLS-Interna bleiben funktionsfähig)
REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin()       FROM anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER-FUNKTIONEN
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Neues Benutzerprofil anlegen ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── updated_at automatisch setzen ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Rollen-Schutz: Benutzer können ihre eigene Rolle nicht erhöhen ────────────
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-Role und interne Aufrufe (kein JWT) erlaubt
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role <> OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    ) THEN
      RAISE EXCEPTION 'Role changes require manager privileges';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Bestellstatus-Übergangsvalidierung ────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_is_manager BOOLEAN;
BEGIN
  v_is_manager := public.has_role(ARRAY['manager']);
  IF v_is_manager THEN RETURN NEW; END IF;

  IF NOT (
    (OLD.status = 'pending'    AND NEW.status IN ('confirmed', 'cancelled')) OR
    (OLD.status = 'confirmed'  AND NEW.status IN ('preparing', 'cancelled')) OR
    (OLD.status = 'preparing'  AND NEW.status = 'on_the_way')               OR
    (OLD.status = 'on_the_way' AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Loyalty-Punkte bei Lieferung vergeben (idempotent, FOR UPDATE) ────────────
CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_points          INT;
  v_already_awarded BOOLEAN;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status != 'delivered'
     AND NEW.user_id IS NOT NULL THEN

    -- Re-read from DB with lock to prevent race conditions
    SELECT loyalty_awarded INTO v_already_awarded
      FROM orders WHERE id = NEW.id FOR UPDATE;

    IF v_already_awarded = TRUE THEN RETURN NEW; END IF;

    v_points := FLOOR(NEW.total)::INT;

    UPDATE profiles
      SET loyalty_points = loyalty_points + v_points,
          total_orders   = total_orders + 1
      WHERE id = NEW.user_id;

    UPDATE orders SET loyalty_awarded = TRUE WHERE id = NEW.id;

    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('loyalty_awarded', NEW.user_id,
              jsonb_build_object('order_id', NEW.id, 'points', v_points));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Statusänderung ins Audit-Log schreiben ────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_protect_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_column();

CREATE TRIGGER trg_validate_status_transition
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_order_status_transition();

CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION handle_order_delivered();

CREATE TRIGGER trg_log_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_phone_usage  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_user_usage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_rate_limit_phone ENABLE ROW LEVEL SECURITY;

-- ── restaurant_settings ──────────────────────────────────────────────────────
-- Nur Manager/Kassier dürfen die Rohtabelle lesen (enthält revenue_goal_daily).
-- Kunden lesen über die restaurant_info View.
CREATE POLICY "Staff read settings" ON restaurant_settings
  FOR SELECT USING (public.has_role(ARRAY['manager', 'cashier']));

CREATE POLICY "Managers manage settings" ON restaurant_settings
  FOR ALL
  USING   (public.has_role(ARRAY['manager']))
  WITH CHECK (public.has_role(ARRAY['manager']));

-- ── categories ───────────────────────────────────────────────────────────────
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Managers manage categories" ON categories
  FOR ALL
  USING   (public.has_role(ARRAY['manager']))
  WITH CHECK (public.has_role(ARRAY['manager']));

-- ── products ─────────────────────────────────────────────────────────────────
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (TRUE);

CREATE POLICY "Managers manage products" ON products
  FOR ALL
  USING   (public.has_role(ARRAY['manager']))
  WITH CHECK (public.has_role(ARRAY['manager']));

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Jeder sieht nur seine eigene Zeile; Manager sehen alle (für AdminCustomers).
CREATE POLICY "Profiles select" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.has_role(ARRAY['manager'])
  );

-- Benutzer dürfen nur erlaubte Felder ändern (Rolle, Punkte und E-Mail gesperrt).
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role           = (SELECT p.role           FROM profiles p WHERE p.id = auth.uid())
    AND loyalty_points = (SELECT p.loyalty_points FROM profiles p WHERE p.id = auth.uid())
    AND total_orders   = (SELECT p.total_orders   FROM profiles p WHERE p.id = auth.uid())
    AND email          = (SELECT p.email          FROM profiles p WHERE p.id = auth.uid())
  );

-- Nur Manager können Profile löschen.
CREATE POLICY "No self delete profile" ON profiles
  FOR DELETE USING (public.has_role(ARRAY['manager']));

-- ── orders ───────────────────────────────────────────────────────────────────
-- Kunden sehen nur eigene Bestellungen; Staff sieht alle.
CREATE POLICY "Orders select" ON orders
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(ARRAY['manager', 'cashier', 'kitchen'])
  );

-- Jeder authentifizierte Benutzer kann eine Bestellung anlegen (via RPC).
CREATE POLICY "Anyone can insert orders" ON orders
  FOR INSERT WITH CHECK (TRUE);

-- Staff darf Status-Felder ändern, aber keine Finanz-Spalten.
CREATE POLICY "Admins update orders" ON orders
  FOR UPDATE
  USING (public.has_role(ARRAY['manager', 'cashier', 'kitchen']))
  WITH CHECK (
    total             = (SELECT o.total             FROM orders o WHERE o.id = id)
    AND subtotal      = (SELECT o.subtotal           FROM orders o WHERE o.id = id)
    AND discount_amount=(SELECT o.discount_amount    FROM orders o WHERE o.id = id)
    AND delivery_fee  = (SELECT o.delivery_fee       FROM orders o WHERE o.id = id)
    AND user_id       IS NOT DISTINCT FROM (SELECT o.user_id      FROM orders o WHERE o.id = id)
    AND order_number  = (SELECT o.order_number       FROM orders o WHERE o.id = id)
    AND coupon_code   IS NOT DISTINCT FROM (SELECT o.coupon_code  FROM orders o WHERE o.id = id)
    -- loyalty_awarded ist immutable sobald TRUE
    AND (
      (SELECT o.loyalty_awarded FROM orders o WHERE o.id = id) = FALSE
      OR loyalty_awarded = (SELECT o.loyalty_awarded FROM orders o WHERE o.id = id)
    )
  );

-- ── coupons ──────────────────────────────────────────────────────────────────
-- Kunden dürfen die Coupons-Tabelle nicht direkt lesen → validate_coupon_public RPC.
CREATE POLICY "coupons_manager_all" ON coupons
  FOR ALL
  USING   (public.has_role(ARRAY['manager']))
  WITH CHECK (public.has_role(ARRAY['manager']));

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Kein direkter Client-Zugriff; SECURITY DEFINER Funktionen schreiben direkt.
CREATE POLICY "No direct insert" ON audit_log FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "No update"        ON audit_log FOR UPDATE USING (FALSE);
CREATE POLICY "No delete"        ON audit_log FOR DELETE USING (FALSE);
CREATE POLICY "Managers read"    ON audit_log FOR SELECT
  USING (public.has_role(ARRAY['manager']));

-- ── coupon_phone_usage ────────────────────────────────────────────────────────
CREATE POLICY "No direct access" ON coupon_phone_usage FOR ALL USING (false);

-- ── coupon_user_usage ─────────────────────────────────────────────────────────
CREATE POLICY "No direct access" ON coupon_user_usage FOR ALL USING (false);

-- ── order_rate_limit_phone ────────────────────────────────────────────────────
CREATE POLICY "No direct access" ON order_rate_limit_phone FOR ALL USING (false);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- Öffentliche Restaurant-Ansicht (ohne sensible Felder wie revenue_goal_daily)
DROP VIEW IF EXISTS public.restaurant_info;
CREATE VIEW public.restaurant_info AS
  SELECT
    name, description, address, phone, email,
    rating, review_count, is_delivery_active,
    delivery_fee, min_order_amount, estimated_delivery_time,
    is_halal_certified, hours, is_announcement_active, announcement, tags,
    hero_images
    -- Bewusst ausgelassen: revenue_goal_daily, delivery_zones (interne Konfiguration)
  FROM restaurant_settings;

GRANT SELECT ON public.restaurant_info TO anon, authenticated;

-- Öffentliche Coupons-Ansicht (ohne den Code — der ist ein Geheimnis)
DROP VIEW IF EXISTS public.coupons_public;
CREATE VIEW public.coupons_public AS
  SELECT id, discount_type, discount_value, min_order_amount,
         is_first_order_only, expires_at
  FROM coupons
  WHERE is_active = TRUE;

GRANT SELECT ON public.coupons_public TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC-FUNKTIONEN
-- ─────────────────────────────────────────────────────────────────────────────

-- ── validate_coupon_public ────────────────────────────────────────────────────
-- Kunden-seitige Coupon-Validierung als SECURITY DEFINER RPC.
-- Einheitliche Fehlermeldungen (kein Oracle für Code-Enumeration).
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
  v_coupon           coupons%ROWTYPE;
  v_discount         DECIMAL := 0;
  v_user_use_count   INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Anmeldung erforderlich');
  END IF;

  SELECT * INTO v_coupon
    FROM coupons
    WHERE code = UPPER(TRIM(p_code))
      AND is_active = TRUE;

  -- Einheitliche Fehlermeldung für alle Fehlerpfade — kein Oracle
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
  END IF;

  -- Pro-Benutzer-Limit
  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_use_count
      FROM coupon_user_usage
      WHERE coupon_id = v_coupon.id AND user_id = auth.uid();

    IF v_user_use_count >= v_coupon.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'errorMessage', 'Ungültiger Gutscheincode');
    END IF;
  END IF;

  IF p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'errorMessage', format('Mindestbestellwert für diesen Gutschein: €%s',
                              to_char(v_coupon.min_order_amount, 'FM999990.00'))
    );
  END IF;

  IF v_coupon.is_first_order_only THEN
    IF EXISTS (
      SELECT 1 FROM orders
      WHERE user_id = auth.uid() AND status NOT IN ('cancelled')
    ) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'errorMessage', 'Dieser Gutschein gilt nur für die erste Bestellung'
      );
    END IF;
  END IF;

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


-- ── create_order_secure ───────────────────────────────────────────────────────
-- Zentrale Bestellfunktion (SECURITY DEFINER).
-- Alle Preise kommen aus der DB — kein Client-Input wird vertraut.
CREATE OR REPLACE FUNCTION create_order_secure(
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_customer_email   TEXT,
  p_delivery_address TEXT,
  p_items            JSONB,
  p_coupon_code      TEXT    DEFAULT NULL,
  p_payment_method   TEXT    DEFAULT 'cash',
  p_notes            TEXT    DEFAULT NULL
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
  v_estimated_time      INT;
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
  v_total_quantity      INT := 0;
  v_user_coupon_uses    INT := 0;
BEGIN

  -- 1. Auth-Check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- 2. Per-User Rate-Limit: max 3 Bestellungen pro Minute
  IF (
    SELECT COUNT(*) FROM orders
    WHERE user_id = auth.uid()
      AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 3 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_user', auth.uid(), jsonb_build_object('reason', 'order_per_minute'));
    RAISE EXCEPTION 'Too many orders. Please wait before placing another order.';
  END IF;

  -- 3. Eingabe-Validierung
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

  -- 4. Telefonnummer normalisieren + Dual-Rate-Limit
  v_phone_normalized  := regexp_replace(p_customer_phone, '[^0-9+]', '', 'g');
  v_phone_normalized  := regexp_replace(v_phone_normalized, '^00', '+');
  v_phone_hash        := encode(digest(v_phone_normalized, 'sha256'), 'hex');
  v_phone_digit_count := LENGTH(regexp_replace(v_phone_normalized, '[^0-9]', '', 'g'));

  IF v_phone_digit_count < 10 THEN
    RAISE EXCEPTION 'Phone number must contain at least 10 digits';
  END IF;

  INSERT INTO order_rate_limit_phone (phone_hash, user_id) VALUES (v_phone_hash, auth.uid());

  IF (SELECT COUNT(*) FROM order_rate_limit_phone
      WHERE phone_hash = v_phone_hash AND created_at > NOW() - INTERVAL '10 minutes') > 5 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_phone', auth.uid(), jsonb_build_object('phone_hash', v_phone_hash));
    RAISE EXCEPTION 'Too many order attempts from this phone number. Please wait.';
  END IF;

  IF (SELECT COUNT(*) FROM order_rate_limit_phone
      WHERE user_id = auth.uid() AND created_at > NOW() - INTERVAL '10 minutes') > 10 THEN
    INSERT INTO audit_log (event_type, user_id, metadata)
      VALUES ('rate_limit_user_attempts', auth.uid(), '{}');
    RAISE EXCEPTION 'Too many order attempts. Please wait.';
  END IF;

  -- 5. Basis-Validierung der Artikel
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in a single order';
  END IF;

  -- 6. Artikel + Extras validieren — ALLE Preise aus der DB
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    IF (v_item->>'quantity')::INT <= 0 OR (v_item->>'quantity')::INT > 20 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 20';
    END IF;

    v_total_quantity := v_total_quantity + (v_item->>'quantity')::INT;
    IF v_total_quantity > 50 THEN
      RAISE EXCEPTION 'Total order quantity cannot exceed 50 items';
    END IF;

    SELECT * INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive';
    END IF;

    v_unit_price       := v_product.price;
    v_validated_extras := '[]'::JSONB;
    v_extras_count     := jsonb_array_length(COALESCE(v_item->'extras', '[]'));

    IF v_extras_count > 20 THEN
      RAISE EXCEPTION 'Too many extras per item (max 20)';
    END IF;

    FOR v_extra IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'extras', '[]')) LOOP
      v_extra_price := 0;
      v_extra_found := FALSE;

      <<group_loop>>
      FOR v_extra_group IN SELECT * FROM jsonb_array_elements(COALESCE(v_product.extra_groups, '[]')) LOOP
        FOR v_extra_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_extra_group->'extras', '[]')) LOOP
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

  -- 7. Liefergebühr + Zone + Lieferzeit — alles aus der DB
  SELECT delivery_fee, min_order_amount, delivery_zones, estimated_delivery_time
    INTO v_delivery_fee, v_min_order, v_delivery_zones, v_estimated_time
    FROM restaurant_settings LIMIT 1;

  IF v_delivery_zones IS NOT NULL AND jsonb_array_length(v_delivery_zones) > 0 THEN
    v_postal_code := COALESCE((regexp_match(p_delivery_address, '.*(\d{5})'))[1], '');

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

  -- 8. Mindestbestellwert
  IF v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'Minimum order amount is €%. Current subtotal: €%', v_min_order, v_subtotal;
  END IF;

  -- 9. Coupon-Validierung
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN

    SET LOCAL lock_timeout = '3s';

    SELECT * INTO v_coupon
      FROM coupons
      WHERE code = UPPER(TRIM(p_coupon_code)) AND is_active = TRUE
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

    -- Pro-Benutzer-Limit
    IF v_coupon.max_uses_per_user IS NOT NULL THEN
      SELECT COUNT(*) INTO v_user_coupon_uses
        FROM coupon_user_usage
        WHERE coupon_id = v_coupon.id AND user_id = auth.uid();

      IF v_user_coupon_uses >= v_coupon.max_uses_per_user THEN
        INSERT INTO audit_log (event_type, user_id, metadata)
          VALUES ('coupon_attempt_failed', auth.uid(),
                  jsonb_build_object('reason', 'per_user_limit', 'coupon_id', v_coupon.id));
        RAISE EXCEPTION 'Invalid or inactive coupon code';
      END IF;
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
        SELECT 1 FROM orders WHERE user_id = auth.uid() AND status NOT IN ('cancelled')
      ) THEN
        RAISE EXCEPTION 'This coupon is valid for first orders only';
      END IF;

      INSERT INTO coupon_phone_usage (coupon_id, phone_hash)
        VALUES (v_coupon.id, v_phone_hash)
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- 10. Endpreis
  v_total := ROUND((v_subtotal + v_delivery_fee - v_discount)::NUMERIC, 2);
  IF v_total < 0 THEN v_total := 0; END IF;

  -- 11. Bestellnummer generieren + einfügen
  v_order_number := 'S47-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO orders (
    order_number, user_id,
    customer_name, customer_phone, customer_email,
    delivery_address,
    items, subtotal, delivery_fee, discount_amount,
    coupon_code, total, payment_method,
    estimated_delivery_time,
    notes, status
  ) VALUES (
    v_order_number, auth.uid(),
    TRIM(p_customer_name), TRIM(p_customer_phone), v_auth_email,
    TRIM(p_delivery_address),
    v_items_validated, v_subtotal, v_delivery_fee, v_discount,
    NULLIF(UPPER(TRIM(p_coupon_code)), ''),
    v_total, p_payment_method,
    v_estimated_time,
    SUBSTRING(COALESCE(p_notes, ''), 1, 1000),
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Coupon-Nutzung pro Benutzer protokollieren
  IF v_coupon.id IS NOT NULL THEN
    INSERT INTO coupon_user_usage (coupon_id, user_id, order_id)
      VALUES (v_coupon.id, auth.uid(), v_order_id);
  END IF;

  INSERT INTO audit_log (event_type, user_id, metadata)
    VALUES ('order_placed', auth.uid(),
            jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number));

  RETURN json_build_object('id', v_order_id, 'order_number', v_order_number)::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BERECHTIGUNGEN
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin()       FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon_public(TEXT, DECIMAL) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SEED-DATEN
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO restaurant_settings (
  name, description, address, phone, email,
  rating, review_count, is_delivery_active,
  delivery_fee, min_order_amount, estimated_delivery_time,
  is_halal_certified, hours
) VALUES (
  'Schawarma-Time',
  'Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!',
  'Bahnhofsallee 14a, 31134 Hildesheim',
  '05121 3030551',
  'info@schawarma-time.de',
  4.8, 30, TRUE, 2.00, 15.00, 35, TRUE,
  '{"monday":{"open":"11:30","close":"22:00","is_closed":false},"tuesday":{"open":"11:30","close":"22:00","is_closed":false},"wednesday":{"open":"11:30","close":"22:00","is_closed":false},"thursday":{"open":"11:30","close":"22:00","is_closed":false},"friday":{"open":"11:30","close":"23:00","is_closed":false},"saturday":{"open":"11:30","close":"23:00","is_closed":false},"sunday":{"open":"11:30","close":"22:00","is_closed":false}}'
);

INSERT INTO categories (name, slug, position) VALUES
  ('Burger',    'burger',    1),
  ('Baguette',  'baguette',  2),
  ('Rolle',     'rolle',     3),
  ('Beilage',   'beilage',   4),
  ('Menü',      'menue',     5),
  ('Getränke',  'getraenke', 6),
  ('Saucen',    'saucen',    7);

INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_first_order_only) VALUES
  ('SMASH10',    'percentage', 10,   15.00, FALSE),
  ('WILLKOMMEN', 'fixed',       3.00, 15.00, TRUE);
