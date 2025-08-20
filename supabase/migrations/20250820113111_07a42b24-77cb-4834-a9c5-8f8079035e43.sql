-- Add missing tables for the application

-- Create approvals table
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL,
  approver_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for approvals
CREATE POLICY "approvals_insert" ON public.approvals
  FOR INSERT 
  WITH CHECK (
    get_user_role() = 'admin' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND client_id IN (
        SELECT client_id FROM quotes WHERE id = quote_id
      )
    )
  );

CREATE POLICY "approvals_select" ON public.approvals
  FOR SELECT 
  USING (
    get_user_role() = 'admin' OR
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND client_id IN (
        SELECT client_id FROM quotes WHERE id = quote_id
      )
    )
  );

CREATE POLICY "approvals_update" ON public.approvals
  FOR UPDATE 
  USING (
    get_user_role() = 'admin' OR
    approver_id = auth.uid()
  );

-- Add trigger for updated_at
CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create approval_levels table for hierarchical approvals
CREATE TABLE IF NOT EXISTS public.approval_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount_threshold DECIMAL(12,2) NOT NULL DEFAULT 0,
  approvers UUID[] NOT NULL DEFAULT '{}',
  order_level INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for approval_levels
ALTER TABLE public.approval_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_levels_insert" ON public.approval_levels
  FOR INSERT 
  WITH CHECK (
    get_user_role() = 'admin' OR 
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "approval_levels_select" ON public.approval_levels
  FOR SELECT 
  USING (
    get_user_role() = 'admin' OR
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "approval_levels_update" ON public.approval_levels
  FOR UPDATE 
  USING (
    get_user_role() = 'admin' OR
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  );

-- Add trigger for updated_at
CREATE TRIGGER update_approval_levels_updated_at
  BEFORE UPDATE ON public.approval_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create integrations table for API keys and configurations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID,
  supplier_id UUID,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('stripe', 'whatsapp', 'email', 'sms')),
  api_key_encrypted TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, supplier_id, integration_type)
);

-- Enable RLS for integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_insert" ON public.integrations
  FOR INSERT 
  WITH CHECK (
    get_user_role() = 'admin' OR 
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
    supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT 
  USING (
    get_user_role() = 'admin' OR
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
    supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "integrations_update" ON public.integrations
  FOR UPDATE 
  USING (
    get_user_role() = 'admin' OR
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
    supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
  );

-- Add trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for new tables
ALTER TABLE public.approvals REPLICA IDENTITY FULL;
ALTER TABLE public.approval_levels REPLICA IDENTITY FULL;
ALTER TABLE public.integrations REPLICA IDENTITY FULL;

-- Add indexes for better performance
CREATE INDEX idx_approvals_quote_id ON public.approvals(quote_id);
CREATE INDEX idx_approvals_approver_id ON public.approvals(approver_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);

CREATE INDEX idx_approval_levels_client_id ON public.approval_levels(client_id);
CREATE INDEX idx_approval_levels_amount_threshold ON public.approval_levels(amount_threshold);

CREATE INDEX idx_integrations_client_id ON public.integrations(client_id);
CREATE INDEX idx_integrations_supplier_id ON public.integrations(supplier_id);
CREATE INDEX idx_integrations_type ON public.integrations(integration_type);