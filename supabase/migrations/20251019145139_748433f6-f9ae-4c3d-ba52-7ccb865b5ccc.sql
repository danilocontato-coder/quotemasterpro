-- =========================================================
-- FASE 3: Políticas RLS para edição via associação
-- =========================================================

-- Política: Cliente pode UPDATE fornecedor local se houver associação ativa
CREATE POLICY "suppliers_client_update_associated_local"
ON public.suppliers
FOR UPDATE
USING (
  user_has_module_access('suppliers') 
  AND type = 'local'
  AND EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
    AND cs.client_id = get_current_user_client_id()
    AND cs.status = 'active'
  )
)
WITH CHECK (
  user_has_module_access('suppliers') 
  AND type = 'local'
  AND EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
    AND cs.client_id = get_current_user_client_id()
    AND cs.status = 'active'
  )
);

-- =========================================================
-- FASE 4: RPC get_client_suppliers para incluir certificados regionais
-- =========================================================

DROP FUNCTION IF EXISTS public.get_client_suppliers();

CREATE FUNCTION public.get_client_suppliers()
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
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_client_id uuid := get_current_user_client_id();
  client_region text;
  client_state text;
BEGIN
  -- Buscar região/estado do cliente
  SELECT c.region, c.state INTO client_region, client_state
  FROM public.clients c
  WHERE c.id = current_client_id
  LIMIT 1;

  RETURN QUERY
  SELECT 
    s.id, s.name, s.cnpj, s.email, s.phone, s.whatsapp, s.website, 
    s.address, s.state, s.city, s.specialties, s.certification_status, s.status,
    s.rating, s.completed_orders,
    COALESCE(cs.status, 'available') as association_status,
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
      -- Fornecedores já associados
      (cs.status = 'active')
      OR
      -- Fornecedores certificados da mesma região (auto-disponíveis)
      (
        s.type = 'certified' 
        AND s.certification_status = 'certified'
        AND (
          s.visibility_scope = 'global'
          OR (s.visibility_scope = 'region' AND (s.region = client_region OR s.state = client_state))
        )
      )
    )
  ORDER BY 
    CASE WHEN s.certification_status = 'certified' THEN 0 ELSE 1 END,
    CASE WHEN cs.status = 'active' THEN 0 ELSE 1 END,
    s.rating DESC NULLS LAST,
    s.name ASC;
END;
$$;