-- QuoteMaster Pro - Simplified Schema with RLS
-- Step-by-step table creation avoiding enum conflicts

-- 1) Create simplified tables first
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_quotes INTEGER NOT NULL DEFAULT 50,
  max_suppliers INTEGER NOT NULL DEFAULT 10,
  max_users INTEGER NOT NULL DEFAULT 3,
  max_storage_gb INTEGER NOT NULL DEFAULT 5,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  target_audience TEXT DEFAULT 'clients',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  subscription_plan_id TEXT REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  address JSONB,
  status TEXT DEFAULT 'pending',
  subscription_plan_id TEXT REFERENCES subscription_plans(id),
  specialties TEXT[],
  type TEXT DEFAULT 'local',
  client_id UUID REFERENCES clients(id),
  region TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  business_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  company_name TEXT,
  client_id UUID REFERENCES clients(id),
  supplier_id UUID REFERENCES suppliers(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  client_id UUID REFERENCES clients(id) NOT NULL,
  client_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  items_count INTEGER DEFAULT 0,
  responses_count INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'active',
  unit_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_time INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  escrow_release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  panel_type TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3) Create security function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Basic RLS policies

-- Subscription plans - readable by all
DROP POLICY IF EXISTS "subscription_plans_select" ON subscription_plans;
CREATE POLICY "subscription_plans_select" ON subscription_plans FOR SELECT TO authenticated USING (true);

-- Profiles - users can manage their own
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR get_user_role() = 'admin');

-- Clients - visible to client users and admins
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "clients_admin" ON clients;
CREATE POLICY "clients_admin" ON clients FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Suppliers - visible to associated users and admins
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR 
  id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid()) OR 
  status = 'active'
);

DROP POLICY IF EXISTS "suppliers_admin" ON suppliers;
CREATE POLICY "suppliers_admin" ON suppliers FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Quotes - visible to client/supplier owners and admins
DROP POLICY IF EXISTS "quotes_select" ON quotes;
CREATE POLICY "quotes_select" ON quotes FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid()) OR
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "quotes_insert" ON quotes;
CREATE POLICY "quotes_insert" ON quotes FOR INSERT TO authenticated WITH CHECK (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "quotes_update" ON quotes;
CREATE POLICY "quotes_update" ON quotes FOR UPDATE TO authenticated USING (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid()
);

-- Quote items inherit from quotes
DROP POLICY IF EXISTS "quote_items_select" ON quote_items;
CREATE POLICY "quote_items_select" ON quote_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND (
    get_user_role() = 'admin' OR
    q.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
    q.created_by = auth.uid()
  ))
);

DROP POLICY IF EXISTS "quote_items_insert" ON quote_items;
CREATE POLICY "quote_items_insert" ON quote_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
);

-- Products - accessible by client/supplier owners
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

-- Notifications - users see their own
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Audit logs - users see their own actions, admins see all
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR user_id = auth.uid()
);

-- 5) Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "attachments_select" ON storage.objects;
CREATE POLICY "attachments_select" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'attachments' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "attachments_insert" ON storage.objects;
CREATE POLICY "attachments_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6) Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 7) Insert subscription plans
INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_quotes, max_suppliers, max_users, features, is_popular)
VALUES 
  ('basic', 'basic', 'Plano Básico', 'Ideal para condomínios pequenos', 99.90, 999.00, 50, 10, 3, '["quotes", "suppliers", "users"]', false),
  ('premium', 'premium', 'Plano Premium', 'Para condomínios médios', 199.90, 1999.00, 200, 50, 10, '["quotes", "suppliers", "users", "advanced"]', true),
  ('enterprise', 'enterprise', 'Plano Enterprise', 'Grandes condomínios', 399.90, 3999.00, -1, -1, -1, '["all"]', false)
ON CONFLICT (id) DO NOTHING;

-- 8) Trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();