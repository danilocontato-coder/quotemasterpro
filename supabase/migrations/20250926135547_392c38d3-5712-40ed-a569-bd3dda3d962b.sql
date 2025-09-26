-- Remover a constraint única do CNPJ para permitir duplicatas entre clientes
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_cnpj_key;

-- Criar constraint única composta para CNPJ + client_id (permitindo CNPJ duplicado entre clientes diferentes)
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_cnpj_client_unique 
UNIQUE (cnpj, client_id);

-- Função para buscar fornecedor por CNPJ
CREATE OR REPLACE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.cnpj,
    s.email,
    s.phone,
    s.whatsapp,
    s.website,
    s.address,
    s.specialties,
    s.client_id,
    c.name as client_name
  FROM public.suppliers s
  LEFT JOIN public.clients c ON c.id = s.client_id
  WHERE public.normalize_cnpj(s.cnpj) = public.normalize_cnpj(search_cnpj)
  AND s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$;