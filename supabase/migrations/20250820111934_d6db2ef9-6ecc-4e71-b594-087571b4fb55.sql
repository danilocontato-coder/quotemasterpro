-- Phase 2: Supabase integration - idempotent schema + RLS policies
-- IMPORTANT: Idempotent creation (safe to re-run)

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Enums (create if missing)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','client','supplier','support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft','sent','receiving','under_review','approved','rejected','paid','cancelled','finalized','trash'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','in_escrow','paid','cancelled','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM ('active','inactive','pending','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optionally ensure app_role exists and includes required roles (for has_role helper)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin','client','supplier','support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure all needed values exist in app_role
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client';
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supplier';
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';
END $$;

-- 3) Core tables
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_quotes INTEGER NOT NULL DEFAULT 50,
  max_suppliers INTEGER NOT NULL DEFAULT 10,
  max_users INTEGER NOT NULL DEFAULT 3,
  max_storage_gb INTEGER NOT NULL DEFAULT 5,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  allow_branding BOOLEAN DEFAULT false,
  allow_custom_domain BOOLEAN DEFAULT false,
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

CREATE TABLE IF NOT EXISTS supplier_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
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
  status supplier_status DEFAULT 'pending',
  subscription_plan_id TEXT REFERENCES subscription_plans(id),
  group_id UUID REFERENCES supplier_groups(id),
  specialties TEXT[],
  type TEXT DEFAULT 'local',
  client_id UUID REFERENCES clients(id),
  region TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  contacts JSONB DEFAULT '[]',
  business_info JSONB DEFAULT '{}',
  financial_info JSONB DEFAULT '{}',
  certifications TEXT[],
  insurance JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (one-to-one with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  company_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link profiles to orgs (safe ALTERs)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
END $$;

-- Role mapping table (RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  status quote_status DEFAULT 'draft',
  client_id UUID REFERENCES clients(id) NOT NULL,
  client_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  items_count INTEGER DEFAULT 0,
  responses_count INTEGER DEFAULT 0,
  response_total DECIMAL(10,2) DEFAULT 0,
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
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code, supplier_id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS quote_response_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  response_id UUID REFERENCES quote_responses(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES quote_items(id),
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) NOT NULL,
  requester_id UUID REFERENCES auth.users(id) NOT NULL,
  status approval_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  approval_id UUID REFERENCES approvals(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) NOT NULL,
  vote approval_status DEFAULT 'pending',
  comment TEXT,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(approval_id, approver_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) NOT NULL,
  quote_name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  client_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  supplier_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  escrow_release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES payments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  quote_id TEXT REFERENCES quotes(id),
  payment_id TEXT REFERENCES payments(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  criteria JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rating_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  supplier_name TEXT NOT NULL,
  quote_id TEXT,
  payment_id TEXT,
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
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
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_id UUID NOT NULL,
  scope TEXT NOT NULL,
  type TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(target_id, scope, type)
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority priority_level DEFAULT 'medium',
  category TEXT,
  client_id UUID REFERENCES clients(id),
  supplier_id UUID REFERENCES suppliers(id),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  priority priority_level DEFAULT 'medium',
  target_audience TEXT DEFAULT 'all',
  published BOOLEAN DEFAULT false,
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Defaults & indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_id ON quote_responses(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_supplier_id ON quote_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 5) Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) RLS enable
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 7) Helper: replace has_role to avoid recursion and invalid refs
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = _role
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- 8) Policies (minimal, secure)
-- subscription_plans: readable by all authenticated; admin can manage
DROP POLICY IF EXISTS sp_select ON subscription_plans;
CREATE POLICY sp_select ON subscription_plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sp_all_admin ON subscription_plans;
CREATE POLICY sp_all_admin ON subscription_plans FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- profiles
DROP POLICY IF EXISTS profiles_self_select ON profiles;
CREATE POLICY profiles_self_select ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role('admin'));
DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role('admin')) WITH CHECK (id = auth.uid() OR public.has_role('admin'));

-- user_roles
DROP POLICY IF EXISTS ur_self_select ON user_roles;
CREATE POLICY ur_self_select ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role('admin'));
DROP POLICY IF EXISTS ur_admin_manage ON user_roles;
CREATE POLICY ur_admin_manage ON user_roles FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- clients
DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated USING (
  public.has_role('admin') OR id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS clients_admin_all ON clients;
CREATE POLICY clients_admin_all ON clients FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- suppliers
DROP POLICY IF EXISTS suppliers_select ON suppliers;
CREATE POLICY suppliers_select ON suppliers FOR SELECT TO authenticated USING (
  public.has_role('admin') OR id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid()) OR status = 'active'
);
DROP POLICY IF EXISTS suppliers_admin_all ON suppliers;
CREATE POLICY suppliers_admin_all ON suppliers FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- products
DROP POLICY IF EXISTS products_select ON products;
CREATE POLICY products_select ON products FOR SELECT TO authenticated USING (
  public.has_role('admin') OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS products_manage_client ON products;
CREATE POLICY products_manage_client ON products FOR INSERT TO authenticated WITH CHECK (
  client_id IS NOT NULL AND client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY products_update_client ON products FOR UPDATE TO authenticated USING (
  client_id IS NOT NULL AND client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
) WITH CHECK (
  client_id IS NOT NULL AND client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY products_admin_all ON products FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- quotes
DROP POLICY IF EXISTS quotes_select ON quotes;
CREATE POLICY quotes_select ON quotes FOR SELECT TO authenticated USING (
  public.has_role('admin')
  OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  OR supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  OR created_by = auth.uid()
);
DROP POLICY IF EXISTS quotes_insert_client ON quotes;
CREATE POLICY quotes_insert_client ON quotes FOR INSERT TO authenticated WITH CHECK (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid()
);
DROP POLICY IF EXISTS quotes_update_client ON quotes;
CREATE POLICY quotes_update_client ON quotes FOR UPDATE TO authenticated USING (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid()
) WITH CHECK (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid()
);
CREATE POLICY quotes_admin_all ON quotes FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- quote_items (inherit via parent quote)
DROP POLICY IF EXISTS qi_select ON quote_items;
CREATE POLICY qi_select ON quote_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND (
    public.has_role('admin')
    OR q.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    OR q.supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
    OR q.created_by = auth.uid()
  ))
);
CREATE POLICY qi_cud_client ON quote_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
);

-- quote_responses
DROP POLICY IF EXISTS qr_select ON quote_responses;
CREATE POLICY qr_select ON quote_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND (
    public.has_role('admin')
    OR q.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    OR q.supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  ))
);
CREATE POLICY qr_insert_supplier ON quote_responses FOR INSERT TO authenticated WITH CHECK (
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY qr_update_supplier ON quote_responses FOR UPDATE TO authenticated USING (
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
) WITH CHECK (
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY qr_admin_all ON quote_responses FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- approvals & votes
DROP POLICY IF EXISTS approvals_select ON approvals;
CREATE POLICY approvals_select ON approvals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND (
    public.has_role('admin') OR q.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  ))
);
CREATE POLICY approvals_insert_client ON approvals FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
);
CREATE POLICY approvals_update_client ON approvals FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
);
CREATE POLICY approvals_admin_all ON approvals FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS votes_select ON approval_votes;
CREATE POLICY votes_select ON approval_votes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM approvals a WHERE a.id = approval_id AND (
    public.has_role('admin') OR a.requester_id = auth.uid()
  )) OR approver_id = auth.uid()
);
CREATE POLICY votes_update_self ON approval_votes FOR UPDATE TO authenticated USING (approver_id = auth.uid()) WITH CHECK (approver_id = auth.uid());
CREATE POLICY votes_insert_self ON approval_votes FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid());

-- payments & transactions
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments FOR SELECT TO authenticated USING (
  public.has_role('admin')
  OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  OR supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY payments_admin_all ON payments FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS pt_select ON payment_transactions;
CREATE POLICY pt_select ON payment_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND (
    public.has_role('admin')
    OR p.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    OR p.supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  ))
);

-- supplier ratings & prompts
DROP POLICY IF EXISTS ratings_select ON supplier_ratings;
CREATE POLICY ratings_select ON supplier_ratings FOR SELECT TO authenticated USING (
  public.has_role('admin') OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR created_by = auth.uid()
);
CREATE POLICY ratings_insert_self ON supplier_ratings FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
);
DROP POLICY IF EXISTS prompts_select ON rating_prompts;
CREATE POLICY prompts_select ON rating_prompts FOR SELECT TO authenticated USING (
  public.has_role('admin') OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

-- notifications
DROP POLICY IF EXISTS notifications_self ON notifications;
CREATE POLICY notifications_self ON notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- audit logs
DROP POLICY IF EXISTS audit_select ON audit_logs;
CREATE POLICY audit_select ON audit_logs FOR SELECT TO authenticated USING (
  public.has_role('admin') OR user_id = auth.uid()
);

-- api_integrations (admin only)
DROP POLICY IF EXISTS api_admin ON api_integrations;
CREATE POLICY api_admin ON api_integrations FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- tickets & messages
DROP POLICY IF EXISTS tickets_select ON tickets;
CREATE POLICY tickets_select ON tickets FOR SELECT TO authenticated USING (
  public.has_role('admin')
  OR created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  OR supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY tickets_insert_self ON tickets FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
);
DROP POLICY IF EXISTS tm_select ON ticket_messages;
CREATE POLICY tm_select ON ticket_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
    public.has_role('admin') OR t.created_by = auth.uid() OR t.assigned_to = auth.uid()
    OR t.client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    OR t.supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  ))
);
CREATE POLICY tm_insert_self ON ticket_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- announcements (read for all auth, manage admin)
DROP POLICY IF EXISTS ann_select ON announcements;
CREATE POLICY ann_select ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ann_admin_all ON announcements;
CREATE POLICY ann_admin_all ON announcements FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- 9) Storage bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments','attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for private per-user folder structure: attachments/{user_id}/...
DO $$ BEGIN
  CREATE POLICY "attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR public.has_role('admin')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  ) WITH CHECK (
    bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role('admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10) Seed minimal plans if not present
INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_quotes, max_suppliers, max_users, max_storage_gb, features, is_popular)
SELECT 'basic','basic','Plano Básico','Ideal para condomínios pequenos',99.90,999.00,50,10,3,5,'["quotes","suppliers","users"]',false
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='basic');

INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_quotes, max_suppliers, max_users, max_storage_gb, features, is_popular)
SELECT 'premium','premium','Plano Premium','Para condomínios médios',199.90,1999.00,200,50,10,20,'["quotes","suppliers","users","advanced"]',true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='premium');

INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_quotes, max_suppliers, max_users, max_storage_gb, features, is_popular)
SELECT 'enterprise','enterprise','Plano Enterprise','Grandes condomínios',399.90,3999.00,-1,-1,-1,100,'["all"]',false
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='enterprise');
