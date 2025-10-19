-- Corrigir RPC para isolar fornecedores locais e exibir certificados automaticamente
CREATE OR REPLACE FUNCTION public.get_client_suppliers()
RETURNS TABLE (
  id uuid, 
  name text, 
  cnpj text, 
  email text, 
  phone text, 
  whatsapp text, 
  website text, 
  address jsonb, 
  state text, 
  city text, 
  specialties text[],
  certification_status text, 
  status text, 
  rating numeric, 
  completed_orders integer,
  association_status text, 
  associated_at timestamp with time zone,
  type text, 
  document_type text, 
  document_number text, 
  created_at timestamp with time zone
) 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  current_client_id uuid := get_current_user_client_id();
  client_region text;
  client_state text;
BEGIN
  -- Buscar região/estado do cliente atual
  SELECT c.region, c.state INTO client_region, client_state
  FROM public.clients c
  WHERE c.id = current_client_id
  LIMIT 1;

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
    s.state, 
    s.city, 
    s.specialties, 
    s.certification_status, 
    s.status, 
    s.rating, 
    s.completed_orders,
    -- Certificados sempre 'available' (não precisam associação)
    -- Locais mostram status real de associação
    CASE 
      WHEN s.type = 'certified' THEN 'available'
      ELSE COALESCE(cs.status, 'inactive')
    END as association_status,
    cs.associated_at,
    s.type, 
    s.document_type, 
    s.document_number, 
    s.created_at
  FROM public.suppliers s
  LEFT JOIN public.client_suppliers cs ON (
    cs.supplier_id = s.id 
    AND cs.client_id = current_client_id
  )
  WHERE 
    s.status = 'active'
    AND (
      -- CASO 1: Fornecedores LOCAIS com associação ATIVA
      (
        s.type = 'local' 
        AND cs.status = 'active'
      )
      OR
      -- CASO 2: Fornecedores CERTIFICADOS da mesma região (aparecem automaticamente)
      (
        s.type = 'certified' 
        AND s.certification_status = 'certified'
        AND (
          s.visibility_scope = 'global'
          OR (
            s.visibility_scope = 'region' 
            AND (s.region = client_region OR s.state = client_state)
          )
        )
      )
    )
  ORDER BY 
    -- Certificados primeiro
    CASE WHEN s.type = 'certified' THEN 0 ELSE 1 END,
    s.rating DESC NULLS LAST,
    s.name ASC;
END;
$$;