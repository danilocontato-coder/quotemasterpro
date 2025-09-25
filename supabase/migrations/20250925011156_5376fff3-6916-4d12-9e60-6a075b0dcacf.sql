-- Criar tabela de avaliações de fornecedores
CREATE TABLE IF NOT EXISTS public.supplier_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL,
  supplier_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
  comments TEXT,
  would_recommend BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "supplier_ratings_insert" 
ON public.supplier_ratings 
FOR INSERT 
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

CREATE POLICY "supplier_ratings_select" 
ON public.supplier_ratings 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
);

CREATE POLICY "supplier_ratings_update" 
ON public.supplier_ratings 
FOR UPDATE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (rater_id = auth.uid())
);

-- Criar índices para performance
CREATE INDEX idx_supplier_ratings_supplier_id ON public.supplier_ratings(supplier_id);
CREATE INDEX idx_supplier_ratings_client_id ON public.supplier_ratings(client_id);
CREATE INDEX idx_supplier_ratings_quote_id ON public.supplier_ratings(quote_id);
CREATE INDEX idx_supplier_ratings_created_at ON public.supplier_ratings(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_supplier_ratings_updated_at
  BEFORE UPDATE ON public.supplier_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de relatórios salvos
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_id UUID,
  created_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT false,
  schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para relatórios salvos
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Políticas para relatórios salvos
CREATE POLICY "saved_reports_admin" 
ON public.saved_reports 
FOR ALL 
USING (get_user_role() = 'admin'::text);

CREATE POLICY "saved_reports_client" 
ON public.saved_reports 
FOR ALL 
USING (
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (created_by = auth.uid())
)
WITH CHECK (
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (created_by = auth.uid())
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular média de avaliações de fornecedor
CREATE OR REPLACE FUNCTION public.get_supplier_average_rating(supplier_uuid UUID)
RETURNS TABLE(
  avg_rating NUMERIC,
  avg_quality NUMERIC,
  avg_delivery NUMERIC,
  avg_communication NUMERIC,
  avg_price NUMERIC,
  total_ratings BIGINT,
  recommendation_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(sr.rating), 2) as avg_rating,
    ROUND(AVG(sr.quality_rating), 2) as avg_quality,
    ROUND(AVG(sr.delivery_rating), 2) as avg_delivery,
    ROUND(AVG(sr.communication_rating), 2) as avg_communication,
    ROUND(AVG(sr.price_rating), 2) as avg_price,
    COUNT(*) as total_ratings,
    ROUND(
      (COUNT(*) FILTER (WHERE sr.would_recommend = true)::NUMERIC / COUNT(*)) * 100, 
      1
    ) as recommendation_rate
  FROM public.supplier_ratings sr
  WHERE sr.supplier_id = supplier_uuid;
END;
$$;