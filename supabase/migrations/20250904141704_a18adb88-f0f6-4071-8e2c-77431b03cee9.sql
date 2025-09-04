-- Adicionar campos para fornecedores certificados e configurações de visibilidade
ALTER TABLE public.suppliers 
ADD COLUMN is_certified boolean DEFAULT false,
ADD COLUMN visibility_scope text DEFAULT 'region' CHECK (visibility_scope IN ('global', 'region')),
ADD COLUMN certification_date timestamp with time zone,
ADD COLUMN certification_expires_at timestamp with time zone;

-- Adicionar índices para melhor performance nas consultas de região
CREATE INDEX idx_suppliers_region_state ON public.suppliers(region, state) WHERE is_certified = true;
CREATE INDEX idx_suppliers_specialties ON public.suppliers USING GIN(specialties) WHERE is_certified = true;

-- Criar tabela de configurações do sistema para limites
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de configurações
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configurações do sistema (apenas admins)
CREATE POLICY "system_settings_admin_all" ON public.system_settings
  FOR ALL USING (get_user_role() = 'admin');

-- Inserir configuração padrão para limite de fornecedores simultâneos
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'supplier_limits',
  '{"max_suppliers_per_quote": 10, "max_certified_suppliers_priority": 5}',
  'Configurações de limites para envio de cotações para fornecedores'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Criar função para buscar fornecedores sugeridos baseado em região e categoria
CREATE OR REPLACE FUNCTION public.suggest_suppliers_for_quote(
  _client_region text,
  _client_state text,
  _client_city text,
  _categories text[],
  _max_suppliers integer DEFAULT 10
)
RETURNS TABLE (
  supplier_id uuid,
  name text,
  region text,
  state text,
  city text,
  specialties text[],
  is_certified boolean,
  visibility_scope text,
  rating numeric,
  match_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.name,
    s.region,
    s.state,
    s.city,
    s.specialties,
    s.is_certified,
    s.visibility_scope,
    s.rating,
    -- Calcular score de compatibilidade
    (
      CASE 
        WHEN s.is_certified THEN 100
        ELSE 50
      END +
      CASE 
        WHEN s.state = _client_state THEN 30
        WHEN s.region = _client_region THEN 20
        ELSE 0
      END +
      CASE 
        WHEN s.specialties && _categories THEN 25
        ELSE 0
      END
    ) as match_score
  FROM public.suppliers s
  WHERE 
    s.status = 'active'
    AND (
      s.visibility_scope = 'global' 
      OR (s.visibility_scope = 'region' AND (s.region = _client_region OR s.state = _client_state))
    )
    AND (
      s.specialties && _categories 
      OR s.is_certified = true
    )
  ORDER BY 
    s.is_certified DESC,
    match_score DESC,
    s.rating DESC NULLS LAST
  LIMIT _max_suppliers;
END;
$$;

-- Trigger para atualizar updated_at em system_settings
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_settings_updated_at();