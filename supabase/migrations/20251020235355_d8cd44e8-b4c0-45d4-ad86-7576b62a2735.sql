-- Corrigir função get_client_suppliers (coluna id ambígua)
CREATE OR REPLACE FUNCTION get_client_suppliers()
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
  certification_status text,
  status text,
  rating numeric,
  completed_orders integer,
  type text,
  is_certified boolean,
  association_status text,
  associated_at timestamptz,
  certification_date timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_client_id uuid;
  current_user_role text;
  current_supplier_id uuid;
BEGIN
  -- Get user info - CORRIGIDO: qualificando a coluna id na subquery
  SELECT 
    COALESCE(p.client_id, (SELECT p2.client_id FROM profiles p2 WHERE p2.id = auth.uid() LIMIT 1)),
    COALESCE(p.role, 'client'),
    p.supplier_id
  INTO current_client_id, current_user_role, current_supplier_id
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Admin sees everything
  IF current_user_role = 'admin' THEN
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
      s.certification_status,
      s.status,
      s.rating,
      s.completed_orders,
      s.type,
      s.is_certified,
      COALESCE(cs.status, 'inactive')::text as association_status,
      cs.associated_at,
      s.certification_date
    FROM suppliers s
    LEFT JOIN client_suppliers cs ON cs.supplier_id = s.id AND cs.client_id = current_client_id
    ORDER BY s.name;
    RETURN;
  END IF;

  -- Supplier sees only their own record
  IF current_user_role = 'supplier' THEN
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
      s.certification_status,
      s.status,
      s.rating,
      s.completed_orders,
      s.type,
      s.is_certified,
      'active'::text as association_status,
      NOW() as associated_at,
      s.certification_date
    FROM suppliers s
    WHERE s.id = current_supplier_id;
    RETURN;
  END IF;

  -- Client sees their local suppliers + certified suppliers in scope
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
    s.certification_status,
    s.status,
    s.rating,
    s.completed_orders,
    s.type,
    s.is_certified,
    COALESCE(cs.status, 'available')::text as association_status,
    cs.associated_at,
    s.certification_date
  FROM suppliers s
  LEFT JOIN client_suppliers cs ON cs.supplier_id = s.id AND cs.client_id = current_client_id
  WHERE 
    s.status = 'active'
    AND (
      -- Fornecedores locais do cliente com associação ativa
      (s.type = 'local' AND s.client_id = current_client_id AND cs.status = 'active')
      OR
      -- Fornecedores certificados no escopo
      (
        s.type = 'certified'
        AND s.is_certified = true
        AND (
          s.visibility_scope = 'global'
          OR (
            s.visibility_scope = 'region'
            AND EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = current_client_id
              AND c.region = s.region
              AND c.state = s.state
            )
          )
        )
      )
    )
  ORDER BY s.name;
END;
$$;