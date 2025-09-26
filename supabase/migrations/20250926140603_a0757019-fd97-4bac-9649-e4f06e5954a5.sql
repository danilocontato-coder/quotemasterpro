-- 1) Ajustar unicidade de CNPJ para permitir o mesmo fornecedor em clientes diferentes
-- Remover índice/constraint antiga (nomes defensivos)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_suppliers_cnpj_unique'
  ) THEN
    EXECUTE 'DROP INDEX public.idx_suppliers_cnpj_unique';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'suppliers_cnpj_key'
  ) THEN
    EXECUTE 'DROP INDEX public.suppliers_cnpj_key';
  END IF;
END $$;

-- Índice único por CNPJ normalizado + client_id (somente quando client_id não é nulo)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_suppliers_cnpj_client
ON public.suppliers ((regexp_replace(cnpj, '[^0-9]', '', 'g')), client_id)
WHERE client_id IS NOT NULL;

-- Índice único para fornecedores certificados globais (client_id nulo)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_suppliers_cnpj_certified
ON public.suppliers ((regexp_replace(cnpj, '[^0-9]', '', 'g')))
WHERE client_id IS NULL;

-- 2) Função para buscar fornecedor por CNPJ, respeitando RLS (cliente atual e/ou certificados globais)
CREATE OR REPLACE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE (
  id uuid,
  name text,
  cnpj text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address jsonb,
  specialties text[],
  client_id uuid,
  client_name text
) SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text := regexp_replace(search_cnpj, '[^0-9]', '', 'g');
  current_client uuid := get_current_user_client_id();
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.cnpj, s.email, s.phone, s.whatsapp, s.website, s.address, s.specialties,
         s.client_id, c.name AS client_name
  FROM public.suppliers s
  LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE regexp_replace(s.cnpj, '[^0-9]', '', 'g') = normalized
    AND (
      s.client_id = current_client
      OR (s.client_id IS NULL AND s.is_certified = true AND s.status = 'active')
    )
  ORDER BY s.client_id NULLS FIRST, s.is_certified DESC, s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_supplier_by_cnpj(text) TO anon, authenticated;