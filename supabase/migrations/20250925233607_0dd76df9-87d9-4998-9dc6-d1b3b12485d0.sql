-- Criar tabela de centros de custo
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  budget_monthly NUMERIC DEFAULT 0,
  budget_annual NUMERIC DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, code)
);

-- Índices para performance
CREATE INDEX idx_cost_centers_client_id ON public.cost_centers(client_id);
CREATE INDEX idx_cost_centers_parent_id ON public.cost_centers(parent_id);
CREATE INDEX idx_cost_centers_active ON public.cost_centers(active);

-- Habilitar RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cost_centers
CREATE POLICY "cost_centers_admin" ON public.cost_centers
FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "cost_centers_client_access" ON public.cost_centers
FOR ALL USING (
  client_id IN (
    SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- Adicionar cost_center_id às tabelas existentes
ALTER TABLE public.quotes ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.quote_items ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Índices para as novas colunas
CREATE INDEX idx_quotes_cost_center_id ON public.quotes(cost_center_id);
CREATE INDEX idx_quote_items_cost_center_id ON public.quote_items(cost_center_id);
CREATE INDEX idx_payments_cost_center_id ON public.payments(cost_center_id);

-- Trigger para updated_at
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para obter hierarquia de centros de custo
CREATE OR REPLACE FUNCTION public.get_cost_center_hierarchy(p_client_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  parent_id UUID,
  budget_monthly NUMERIC,
  budget_annual NUMERIC,
  level INTEGER,
  path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE cost_center_tree AS (
    -- Nós raiz (sem parent)
    SELECT 
      cc.id,
      cc.name,
      cc.code,
      cc.description,
      cc.parent_id,
      cc.budget_monthly,
      cc.budget_annual,
      0 as level,
      cc.code as path
    FROM public.cost_centers cc
    WHERE cc.client_id = p_client_id 
      AND cc.parent_id IS NULL 
      AND cc.active = true
    
    UNION ALL
    
    -- Nós filhos
    SELECT 
      cc.id,
      cc.name,
      cc.code,
      cc.description,
      cc.parent_id,
      cc.budget_monthly,
      cc.budget_annual,
      cct.level + 1,
      cct.path || ' > ' || cc.code
    FROM public.cost_centers cc
    INNER JOIN cost_center_tree cct ON cc.parent_id = cct.id
    WHERE cc.active = true
  )
  SELECT * FROM cost_center_tree ORDER BY path;
END;
$$;

-- Função para calcular gastos por centro de custo
CREATE OR REPLACE FUNCTION public.get_cost_center_spending(
  p_client_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  cost_center_id UUID,
  cost_center_name TEXT,
  cost_center_code TEXT,
  total_spent NUMERIC,
  quote_count INTEGER,
  payment_count INTEGER,
  budget_monthly NUMERIC,
  budget_annual NUMERIC,
  budget_variance_monthly NUMERIC,
  budget_variance_annual NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_filter DATE := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  end_filter DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.code,
    COALESCE(SUM(p.amount), 0) as total_spent,
    COUNT(DISTINCT q.id)::INTEGER as quote_count,
    COUNT(DISTINCT p.id)::INTEGER as payment_count,
    cc.budget_monthly,
    cc.budget_annual,
    (cc.budget_monthly - COALESCE(SUM(p.amount), 0)) as budget_variance_monthly,
    (cc.budget_annual - COALESCE(SUM(p.amount), 0)) as budget_variance_annual
  FROM public.cost_centers cc
  LEFT JOIN public.quotes q ON q.cost_center_id = cc.id 
    AND q.created_at::DATE BETWEEN start_filter AND end_filter
  LEFT JOIN public.payments p ON p.cost_center_id = cc.id 
    AND p.created_at::DATE BETWEEN start_filter AND end_filter
    AND p.status = 'completed'
  WHERE cc.client_id = p_client_id 
    AND cc.active = true
  GROUP BY cc.id, cc.name, cc.code, cc.budget_monthly, cc.budget_annual
  ORDER BY total_spent DESC;
END;
$$;