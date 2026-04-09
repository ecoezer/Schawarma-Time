-- =============================================
-- SMASH47 — Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- RESTAURANT SETTINGS
-- =============================================
CREATE TABLE restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Smash47',
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  hero_images JSONB DEFAULT '[]',
  rating DECIMAL(3,2) DEFAULT 4.8,
  review_count INT DEFAULT 0,
  is_delivery_active BOOLEAN DEFAULT TRUE,
  delivery_fee DECIMAL(10,2) DEFAULT 2.00,
  min_order_amount DECIMAL(10,2) DEFAULT 15.00,
  estimated_delivery_time INT DEFAULT 35,
  delivery_radius_km DECIMAL(5,2) DEFAULT 5.0,
  delivery_zones JSONB DEFAULT '[]',
  hours JSONB DEFAULT '{}',
  is_halal_certified BOOLEAN DEFAULT TRUE,
  announcement TEXT,
  is_announcement_active BOOLEAN DEFAULT FALSE,
  revenue_goal_daily DECIMAL(10,2) DEFAULT 500.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  position INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_most_liked BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_halal BOOLEAN DEFAULT TRUE,
  allergens JSONB DEFAULT '[]',
  calories INT,
  extra_groups JSONB DEFAULT '[]',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  birth_date DATE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'kitchen', 'manager')),
  addresses JSONB DEFAULT '[]',
  loyalty_points INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  coupon_code TEXT,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card_on_delivery')),
  estimated_delivery_time INT,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COUPONS
-- =============================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  is_first_order_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE restaurant_settings REPLICA IDENTITY FULL;

-- Enable realtime for orders (for admin live panel)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE orders, restaurant_settings;
COMMIT;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Restaurant Settings: read by all, write by managers only
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON restaurant_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admin write settings" ON restaurant_settings FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager')));

-- Categories: read by all, write by managers
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Admin write categories" ON categories FOR ALL
  USING (public.has_role(ARRAY['manager', 'cashier']));

-- Products: read by all, write by managers
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON products FOR SELECT USING (TRUE);
CREATE POLICY "Admin write products" ON products FOR ALL
  USING (public.has_role(ARRAY['manager', 'cashier']));

-- Orders: customers read their own, admins read all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own orders" ON orders FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['manager', 'cashier', 'kitchen']));
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins update orders" ON orders FOR UPDATE
  USING (public.has_role(ARRAY['manager', 'cashier', 'kitchen']));

-- Profiles: users read/update their own, managers read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers read all profiles" ON profiles;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Managers read all profiles" ON profiles FOR SELECT
  USING (public.has_role(ARRAY['manager']));

-- Coupons: read by all (for validation), write by managers
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins write coupons" ON coupons FOR ALL
  USING (public.has_role(ARRAY['manager']));

-- =============================================
-- TRIGGER: auto-create profile on signup
-- =============================================
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER: update updated_at columns
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON restaurant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA — Restaurant Settings
-- =============================================
INSERT INTO restaurant_settings (name, description, address, phone, email, rating, review_count, is_delivery_active, delivery_fee, min_order_amount, estimated_delivery_time, is_halal_certified, hours)
VALUES (
  'Smash47',
  'Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!',
  'Bahnhofsallee 14a, 31134 Hildesheim',
  '+49 5121 000000',
  'info@smash47.de',
  4.8,
  30,
  TRUE,
  2.00,
  15.00,
  35,
  TRUE,
  '{"monday":{"open":"11:30","close":"22:00","is_closed":false},"tuesday":{"open":"11:30","close":"22:00","is_closed":false},"wednesday":{"open":"11:30","close":"22:00","is_closed":false},"thursday":{"open":"11:30","close":"22:00","is_closed":false},"friday":{"open":"11:30","close":"23:00","is_closed":false},"saturday":{"open":"11:30","close":"23:00","is_closed":false},"sunday":{"open":"11:30","close":"22:00","is_closed":false}}'
);

-- =============================================
-- SEED DATA — Categories
-- =============================================
INSERT INTO categories (name, slug, position) VALUES
  ('Burger', 'burger', 1),
  ('Baguette', 'baguette', 2),
  ('Rolle', 'rolle', 3),
  ('Beilage', 'beilage', 4),
  ('Menü', 'menue', 5),
  ('Getränke', 'getraenke', 6),
  ('Saucen', 'saucen', 7);

-- =============================================
-- SEED DATA — Demo Coupons
-- =============================================
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_first_order_only) VALUES
  ('SMASH10', 'percentage', 10, 15.00, FALSE),
  ('WILLKOMMEN', 'fixed', 3.00, 15.00, TRUE);
