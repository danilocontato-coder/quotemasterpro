-- Criar tabelas para módulo financeiro
-- Tabela de assinaturas ativas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'past_due')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de faturas/invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY DEFAULT ('INV-' || extract(epoch from now())::bigint),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'past_due', 'cancelled', 'uncollectible')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_invoice_id TEXT UNIQUE,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'boleto', 'pix', 'manual')),
  boleto_url TEXT,
  boleto_barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de configurações financeiras do sistema
CREATE TABLE IF NOT EXISTS public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  days_before_suspension INTEGER DEFAULT 7 CHECK (days_before_suspension > 0),
  days_grace_period INTEGER DEFAULT 3 CHECK (days_grace_period >= 0),
  auto_suspend_enabled BOOLEAN DEFAULT true,
  auto_billing_enabled BOOLEAN DEFAULT true,
  reminder_intervals JSONB DEFAULT '[3, 7, 14]'::jsonb,
  late_fee_percentage NUMERIC DEFAULT 2.0 CHECK (late_fee_percentage >= 0),
  stripe_webhook_secret TEXT,
  boleto_provider TEXT DEFAULT 'pag_seguro',
  boleto_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de logs financeiros (auditoria)
CREATE TABLE IF NOT EXISTS public.financial_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  automated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.financial_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions FOR ALL 
TO authenticated 
USING (get_user_role() = 'admin');

CREATE POLICY "Clients can view their subscriptions" 
ON public.subscriptions FOR SELECT
TO authenticated 
USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Suppliers can view their subscriptions" 
ON public.subscriptions FOR SELECT
TO authenticated 
USING (supplier_id = get_current_user_supplier_id());

-- Políticas RLS para invoices
CREATE POLICY "Admins can manage all invoices" 
ON public.invoices FOR ALL 
TO authenticated 
USING (get_user_role() = 'admin');

CREATE POLICY "Clients can view their invoices" 
ON public.invoices FOR SELECT
TO authenticated 
USING (client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Suppliers can view their invoices" 
ON public.invoices FOR SELECT
TO authenticated 
USING (supplier_id = get_current_user_supplier_id());

-- Políticas RLS para financial_settings
CREATE POLICY "Only admins can manage financial settings" 
ON public.financial_settings FOR ALL 
TO authenticated 
USING (get_user_role() = 'admin');

-- Políticas RLS para financial_logs
CREATE POLICY "Only admins can view financial logs" 
ON public.financial_logs FOR SELECT
TO authenticated 
USING (get_user_role() = 'admin');

CREATE POLICY "System can insert financial logs" 
ON public.financial_logs FOR INSERT
TO authenticated 
WITH CHECK (true);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_financial()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_financial();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_financial();

CREATE TRIGGER update_financial_settings_updated_at
  BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_financial();

-- Função para log financeiro automático
CREATE OR REPLACE FUNCTION log_financial_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.financial_logs (
    entity_type,
    entity_id, 
    action,
    old_data,
    new_data,
    user_id,
    automated
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN TG_TABLE_NAME = 'subscriptions' THEN NEW.id::text
      WHEN TG_TABLE_NAME = 'invoices' THEN NEW.id
      ELSE NEW.id::text
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    auth.uid(),
    false
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers para logging automático
CREATE TRIGGER log_subscription_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_financial_change();

CREATE TRIGGER log_invoice_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION log_financial_change();