-- Leden Cafe CMS Schema

-- Order status enum
CREATE TYPE order_status AS ENUM ('new', 'preparing', 'ready', 'picked_up', 'cancelled');

-- Categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_fr text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu items
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_fr text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  available boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);

-- Modifiers (e.g. "Size", "Milk")
CREATE TABLE modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  sort_order int DEFAULT 0
);

-- Modifier options (e.g. "Regular", "Large")
CREATE TABLE modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_id uuid NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  price_adjustment numeric(10,2) DEFAULT 0,
  sort_order int DEFAULT 0
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  pickup_time timestamptz,
  status order_status DEFAULT 'new',
  subtotal numeric(10,2) NOT NULL,
  tax_gst numeric(10,2) NOT NULL,
  tax_qst numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  locale text DEFAULT 'en',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Order items (denormalized snapshot)
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid,
  menu_item_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  modifiers jsonb DEFAULT '[]'
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Cafe info (single-row table)
CREATE TABLE cafe_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hours jsonb NOT NULL DEFAULT '[]',
  address text,
  phone text,
  announcement_en text,
  announcement_fr text,
  pickup_lead_time int DEFAULT 15,
  max_advance_order_days int DEFAULT 3,
  updated_at timestamptz DEFAULT now()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cafe_info_updated_at BEFORE UPDATE ON cafe_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_info ENABLE ROW LEVEL SECURITY;

-- Public read on content tables
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public read modifiers" ON modifiers FOR SELECT USING (true);
CREATE POLICY "Public read modifier_options" ON modifier_options FOR SELECT USING (true);
CREATE POLICY "Public read cafe_info" ON cafe_info FOR SELECT USING (true);

-- Anonymous can insert orders (customer order submission)
CREATE POLICY "Anon insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert order_items" ON order_items FOR INSERT WITH CHECK (true);

-- Authenticated (admin) full access on all tables
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all menu_items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all modifiers" ON modifiers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all modifier_options" ON modifier_options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all cafe_info" ON cafe_info FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime on orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
