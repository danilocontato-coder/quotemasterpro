-- =====================================================
-- FASE 1: Módulo de Prestação de Contas
-- =====================================================

-- 1.1 Criar tabela accountability_records
CREATE TABLE IF NOT EXISTS public.accountability_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT REFERENCES public.payments(id),
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('purchase', 'service', 'maintenance', 'other')),
  destination TEXT NOT NULL,
  amount_spent NUMERIC(15,2) NOT NULL,
  accountability_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Criar tabela accountability_attachments
CREATE TABLE IF NOT EXISTS public.accountability_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountability_record_id UUID REFERENCES public.accountability_records(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('nfe', 'receipt', 'payment_proof', 'contract', 'photo', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  nfe_key TEXT,
  nfe_data JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES public.profiles(id)
);

-- 1.3 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_accountability_client ON public.accountability_records(client_id);
CREATE INDEX IF NOT EXISTS idx_accountability_payment ON public.accountability_records(payment_id);
CREATE INDEX IF NOT EXISTS idx_accountability_status ON public.accountability_records(status);
CREATE INDEX IF NOT EXISTS idx_accountability_date ON public.accountability_records(accountability_date DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_record ON public.accountability_attachments(accountability_record_id);

-- 1.4 Habilitar RLS
ALTER TABLE public.accountability_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_attachments ENABLE ROW LEVEL SECURITY;

-- 1.5 Políticas RLS para accountability_records

-- Administradoras e condomínios podem criar para seus próprios condomínios
CREATE POLICY accountability_insert ON public.accountability_records
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_module_access('accountability'::text) AND
    (
      client_id = get_current_user_client_id() OR
      client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  );

-- Visualização: admin vê de todos condomínios gerenciados, condomínio vê próprios
CREATE POLICY accountability_select ON public.accountability_records
  FOR SELECT TO authenticated
  USING (
    user_has_module_access('accountability'::text) AND
    (
      get_user_role() = 'admin'::text OR
      client_id = get_current_user_client_id() OR
      client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  );

-- Atualização: administradora pode editar e aprovar de condomínios gerenciados, condomínio pode editar próprios
CREATE POLICY accountability_update ON public.accountability_records
  FOR UPDATE TO authenticated
  USING (
    user_has_module_access('accountability'::text) AND
    (
      get_user_role() = 'admin'::text OR
      client_id = get_current_user_client_id() OR
      client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  );

-- Exclusão: apenas administradora de condomínios gerenciados ou próprio condomínio
CREATE POLICY accountability_delete ON public.accountability_records
  FOR DELETE TO authenticated
  USING (
    user_has_module_access('accountability'::text) AND
    (
      get_user_role() = 'admin'::text OR
      client_id = get_current_user_client_id() OR
      client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  );

-- 1.6 Políticas RLS para accountability_attachments

-- Visualização: herda da accountability_record
CREATE POLICY attachments_select ON public.accountability_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_records ar
      WHERE ar.id = accountability_attachments.accountability_record_id
      AND user_has_module_access('accountability'::text)
      AND (
        get_user_role() = 'admin'::text OR
        ar.client_id = get_current_user_client_id() OR
        ar.client_id IN (
          SELECT id FROM public.clients 
          WHERE parent_client_id = get_current_user_client_id()
        )
      )
    )
  );

-- Inserção: pode inserir se pode ver o record
CREATE POLICY attachments_insert ON public.accountability_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_records ar
      WHERE ar.id = accountability_attachments.accountability_record_id
      AND user_has_module_access('accountability'::text)
      AND (
        get_user_role() = 'admin'::text OR
        ar.client_id = get_current_user_client_id() OR
        ar.client_id IN (
          SELECT id FROM public.clients 
          WHERE parent_client_id = get_current_user_client_id()
        )
      )
    )
  );

-- Exclusão: apenas quem pode gerenciar o record
CREATE POLICY attachments_delete ON public.accountability_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_records ar
      WHERE ar.id = accountability_attachments.accountability_record_id
      AND user_has_module_access('accountability'::text)
      AND (
        get_user_role() = 'admin'::text OR
        ar.client_id = get_current_user_client_id() OR
        ar.client_id IN (
          SELECT id FROM public.clients 
          WHERE parent_client_id = get_current_user_client_id()
        )
      )
    )
  );

-- 1.7 Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_accountability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accountability_records_updated_at
  BEFORE UPDATE ON public.accountability_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_updated_at();

-- 1.8 Adicionar módulo aos planos Pro e Enterprise
UPDATE public.subscription_plans
SET enabled_modules = 
  CASE 
    WHEN enabled_modules IS NULL THEN '["accountability"]'::jsonb
    WHEN NOT enabled_modules ? 'accountability' THEN enabled_modules || '["accountability"]'::jsonb
    ELSE enabled_modules
  END
WHERE id IN ('plan-pro', 'plan-enterprise');