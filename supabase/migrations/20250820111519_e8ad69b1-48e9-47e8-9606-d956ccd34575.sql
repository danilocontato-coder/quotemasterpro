-- QuoteMaster Pro - Complete Database Schema
-- Criando esquema completo para integração com Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'client', 'supplier', 'support');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'receiving', 'under_review', 'approved', 'rejected', 'paid', 'cancelled', 'finalized', 'trash');
CREATE TYPE payment_status AS ENUM ('pending', 'in_escrow', 'paid', 'cancelled', 'disputed');
CREATE TYPE supplier_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Subscription plans table
CREATE TABLE subscription_plans (
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

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
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

-- Clients table
CREATE TABLE clients (
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

-- Supplier groups table
CREATE TABLE supplier_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers table
CREATE TABLE suppliers (
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
  type TEXT DEFAULT 'local', -- 'local' or 'global'
  client_id UUID REFERENCES clients(id), -- For local suppliers
  region TEXT, -- For global suppliers
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

-- User groups table (for RBAC)
CREATE TABLE user_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[],
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User group memberships
CREATE TABLE user_group_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id), -- For client-specific products
  status TEXT DEFAULT 'active',
  unit_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code, supplier_id)
);

-- Quotes table
CREATE TABLE quotes (
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
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quote items table
CREATE TABLE quote_items (
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

-- Quote responses table (supplier responses to quotes)
CREATE TABLE quote_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_time INTEGER, -- in days
  notes TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_id, supplier_id)
);

-- Quote response items
CREATE TABLE quote_response_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  response_id UUID REFERENCES quote_responses(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES quote_items(id),
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Approvals table
CREATE TABLE approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id TEXT REFERENCES quotes(id) NOT NULL,
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  status approval_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Approval levels/votes
CREATE TABLE approval_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  approval_id UUID REFERENCES approvals(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES profiles(id) NOT NULL,
  vote approval_status DEFAULT 'pending',
  comment TEXT,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(approval_id, approver_id)
);

-- Payments table
CREATE TABLE payments (
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

-- Payment transactions table
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES payments(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment_created', 'payment_received', 'funds_held', 'funds_released', etc.
  description TEXT NOT NULL,
  amount DECIMAL(10,2),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier ratings table
CREATE TABLE supplier_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  quote_id TEXT REFERENCES quotes(id),
  payment_id TEXT REFERENCES payments(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  criteria JSONB, -- detailed ratings for different criteria
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rating prompts table (for tracking when to ask for ratings)
CREATE TABLE rating_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL, -- 'quote_completed', 'payment_confirmed', 'delivery_received'
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  supplier_name TEXT NOT NULL,
  quote_id TEXT,
  payment_id TEXT,
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  panel_type TEXT, -- 'client', 'supplier', 'admin'
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API integrations table (for storing encrypted API keys)
CREATE TABLE api_integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_id UUID NOT NULL, -- client_id or supplier_id
  scope TEXT NOT NULL, -- 'client' or 'supplier'  
  type TEXT NOT NULL, -- 'whatsapp', 'email', 'payment'
  api_key_encrypted TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(target_id, scope, type)
);

-- Communication tickets table
CREATE TABLE tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority priority_level DEFAULT 'medium',
  category TEXT,
  client_id UUID REFERENCES clients(id),
  supplier_id UUID REFERENCES suppliers(id),
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket messages table
CREATE TABLE ticket_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes vs public messages
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements table
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  priority priority_level DEFAULT 'medium',
  target_audience TEXT DEFAULT 'all', -- 'all', 'clients', 'suppliers', 'admins'
  published BOOLEAN DEFAULT false,
  published_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_supplier_id ON quotes(supplier_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_responses_quote_id ON quote_responses(quote_id);
CREATE INDEX idx_quote_responses_supplier_id ON quote_responses(supplier_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_type ON suppliers(type);
CREATE INDEX idx_suppliers_client_id ON suppliers(client_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, display_name, description, monthly_price, yearly_price, max_quotes, max_suppliers, max_users, max_storage_gb, features, is_popular) VALUES
('basic', 'basic', 'Plano Básico', 'Ideal para condomínios pequenos', 99.90, 999.00, 50, 10, 3, 5, '["quotes", "suppliers", "users", "email_support", "basic_reports"]', false),
('premium', 'premium', 'Plano Premium', 'Para condomínios médios com necessidades avançadas', 199.90, 1999.00, 200, 50, 10, 20, '["quotes", "suppliers", "users", "priority_support", "advanced_reports", "market_analysis", "whatsapp", "backup"]', true),
('enterprise', 'enterprise', 'Plano Enterprise', 'Solução completa para grandes condomínios', 399.90, 3999.00, -1, -1, -1, 100, '["quotes", "suppliers", "users", "24_7_support", "custom_reports", "api", "integrations", "manager", "training"]', false);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();