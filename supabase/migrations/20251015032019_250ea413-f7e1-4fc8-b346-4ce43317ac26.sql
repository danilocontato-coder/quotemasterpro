-- Tabela para armazenar análises de propostas geradas por IA
CREATE TABLE public.ai_proposal_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Tipo de análise
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('individual', 'comparative')),
  
  -- Dados da proposta analisada (apenas para individual)
  proposal_id TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  
  -- Resultado completo da análise (JSONB para flexibilidade)
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para otimizar consultas
CREATE INDEX idx_ai_analyses_quote_id ON public.ai_proposal_analyses(quote_id);
CREATE INDEX idx_ai_analyses_client_id ON public.ai_proposal_analyses(client_id);
CREATE INDEX idx_ai_analyses_type ON public.ai_proposal_analyses(analysis_type);
CREATE INDEX idx_ai_analyses_created_at ON public.ai_proposal_analyses(created_at DESC);

-- Constraint único para análises individuais
CREATE UNIQUE INDEX unique_individual_analysis 
  ON public.ai_proposal_analyses(quote_id, proposal_id, analysis_type)
  WHERE analysis_type = 'individual' AND proposal_id IS NOT NULL;

-- Constraint único para análises comparativas (apenas uma por cotação)
CREATE UNIQUE INDEX unique_comparative_analysis 
  ON public.ai_proposal_analyses(quote_id, analysis_type)
  WHERE analysis_type = 'comparative';

-- Habilitar RLS
ALTER TABLE public.ai_proposal_analyses ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY "ai_analyses_admin_all"
ON public.ai_proposal_analyses
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

-- Clientes podem inserir análises de suas cotações
CREATE POLICY "ai_analyses_client_insert"
ON public.ai_proposal_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_current_user_client_id()
  AND EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = ai_proposal_analyses.quote_id 
    AND q.client_id = get_current_user_client_id()
  )
);

-- Clientes podem ver análises de suas cotações
CREATE POLICY "ai_analyses_client_select"
ON public.ai_proposal_analyses
FOR SELECT
TO authenticated
USING (
  client_id = get_current_user_client_id()
  OR get_user_role() = 'admin'
);

-- Fornecedores podem ver apenas análises individuais de suas propostas
CREATE POLICY "ai_analyses_supplier_select"
ON public.ai_proposal_analyses
FOR SELECT
TO authenticated
USING (
  analysis_type = 'individual'
  AND supplier_id = get_current_user_supplier_id()
);

COMMENT ON TABLE public.ai_proposal_analyses IS 'Armazena análises qualitativas e comparativas de propostas geradas pelo Consultor IA';