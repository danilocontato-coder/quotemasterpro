-- Migration 1: Criar tabela quote_visits para gerenciar visitas técnicas

CREATE TABLE public.quote_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  
  -- Datas
  scheduled_date TIMESTAMPTZ NOT NULL,
  confirmed_date TIMESTAMPTZ,
  requested_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'overdue')),
  
  -- Informações da visita
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Reagendamento
  reschedule_count INT DEFAULT 0,
  reschedule_reason TEXT,
  previous_date TIMESTAMPTZ,
  
  -- Confirmação
  confirmed_by UUID REFERENCES auth.users(id),
  confirmation_notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_quote_visits_quote_id ON public.quote_visits(quote_id);
CREATE INDEX idx_quote_visits_supplier_id ON public.quote_visits(supplier_id);
CREATE INDEX idx_quote_visits_client_id ON public.quote_visits(client_id);
CREATE INDEX idx_quote_visits_status ON public.quote_visits(status);
CREATE INDEX idx_quote_visits_scheduled_date ON public.quote_visits(scheduled_date);

-- RLS Policies
ALTER TABLE public.quote_visits ENABLE ROW LEVEL SECURITY;

-- Clientes podem ver visitas de suas cotações
CREATE POLICY "quote_visits_client_select" ON public.quote_visits
  FOR SELECT USING (
    client_id = get_current_user_client_id() OR 
    get_user_role() = 'admin'
  );

-- Fornecedores podem ver suas próprias visitas
CREATE POLICY "quote_visits_supplier_select" ON public.quote_visits
  FOR SELECT USING (
    supplier_id = get_current_user_supplier_id() OR 
    get_user_role() = 'admin'
  );

-- Fornecedores podem agendar visitas
CREATE POLICY "quote_visits_supplier_insert" ON public.quote_visits
  FOR INSERT WITH CHECK (
    supplier_id = get_current_user_supplier_id() OR 
    get_user_role() = 'admin'
  );

-- Fornecedores podem atualizar suas visitas (confirmar, reagendar)
CREATE POLICY "quote_visits_supplier_update" ON public.quote_visits
  FOR UPDATE USING (
    supplier_id = get_current_user_supplier_id() OR 
    get_user_role() = 'admin'
  );

-- Admin pode tudo
CREATE POLICY "quote_visits_admin_all" ON public.quote_visits
  FOR ALL USING (get_user_role() = 'admin');

-- Comentários para documentação
COMMENT ON TABLE public.quote_visits IS 'Gerencia agendamentos de visitas técnicas para cotações de serviço';
COMMENT ON COLUMN public.quote_visits.reschedule_count IS 'Número de vezes que a visita foi reagendada';
COMMENT ON COLUMN public.quote_visits.attachments IS 'Array de URLs de fotos/documentos da visita realizada';