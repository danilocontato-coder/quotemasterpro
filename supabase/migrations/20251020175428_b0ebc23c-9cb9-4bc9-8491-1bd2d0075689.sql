-- ============================================================================
-- CORREÇÃO DEFINITIVA DO MÓDULO FORNECEDORES
-- ============================================================================
-- Problema: Vazamento de dados entre clientes + falta de RLS
-- Solução: Corrigir RPC, adicionar RLS em suppliers e client_suppliers
-- ============================================================================

-- ============================================================================
-- FASE 1: Corrigir função get_client_suppliers()
-- ============================================================================
-- Drop função existente primeiro
DROP FUNCTION IF EXISTS get_client_suppliers();

-- Recriar função com correção de isolamento
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
  associated_at timestamp with time zone,
  certification_date timestamp with time zone
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
  -- Get user info
  SELECT 
    COALESCE(p.client_id, (SELECT client_id FROM profiles WHERE id = auth.uid() LIMIT 1)),
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

  -- Client sees:
  -- 1. Their own local suppliers with active association
  -- 2. Certified suppliers in their scope
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
      -- CORREÇÃO CRÍTICA: Fornecedores locais devem ser do client_id atual
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

-- ============================================================================
-- FASE 2: Adicionar RLS na tabela suppliers
-- ============================================================================
DROP POLICY IF EXISTS suppliers_client_view ON suppliers;
DROP POLICY IF EXISTS suppliers_supplier_view ON suppliers;
DROP POLICY IF EXISTS suppliers_admin_view ON suppliers;

CREATE POLICY suppliers_client_view ON suppliers
FOR SELECT TO authenticated
USING (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND (
    (type = 'local' AND client_id = get_current_user_client_id())
    OR
    (
      type = 'certified' 
      AND status = 'active'
      AND is_certified = true
      AND (
        visibility_scope = 'global'
        OR (
          visibility_scope = 'region'
          AND (region, state) IN (
            SELECT region, state FROM clients WHERE id = get_current_user_client_id()
          )
        )
      )
    )
  )
);

CREATE POLICY suppliers_supplier_view ON suppliers
FOR SELECT TO authenticated
USING (
  get_user_role() = 'supplier'
  AND id = get_current_user_supplier_id()
);

CREATE POLICY suppliers_admin_view ON suppliers
FOR SELECT TO authenticated
USING (get_user_role() = 'admin');

-- ============================================================================
-- FASE 3: Adicionar RLS na tabela client_suppliers
-- ============================================================================
DROP POLICY IF EXISTS client_suppliers_client_view ON client_suppliers;
DROP POLICY IF EXISTS client_suppliers_supplier_view ON client_suppliers;
DROP POLICY IF EXISTS client_suppliers_admin_view ON client_suppliers;

CREATE POLICY client_suppliers_client_view ON client_suppliers
FOR SELECT TO authenticated
USING (
  get_user_role() IN ('client', 'manager', 'collaborator', 'admin_cliente')
  AND client_id = get_current_user_client_id()
);

CREATE POLICY client_suppliers_supplier_view ON client_suppliers
FOR SELECT TO authenticated
USING (
  get_user_role() = 'supplier'
  AND supplier_id = get_current_user_supplier_id()
);

CREATE POLICY client_suppliers_admin_view ON client_suppliers
FOR SELECT TO authenticated
USING (get_user_role() = 'admin');

-- ============================================================================
-- FASE 4: Atualizar cliente debug
-- ============================================================================
UPDATE clients 
SET 
  region = 'Nordeste', 
  state = 'BA',
  updated_at = NOW()
WHERE id = '38db2d1f-4fab-407c-9e9f-c3b6533e7cfa';

-- ============================================================================
-- FASE 5: Auditoria
-- ============================================================================
CREATE OR REPLACE FUNCTION log_client_supplier_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (auth.uid(), 'SUPPLIER_ASSOCIATED', 'client_suppliers', NEW.id::text, 'client',
      jsonb_build_object('client_id', NEW.client_id, 'supplier_id', NEW.supplier_id, 'status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (auth.uid(), 'SUPPLIER_ASSOCIATION_UPDATED', 'client_suppliers', NEW.id::text, 'client',
      jsonb_build_object('client_id', NEW.client_id, 'supplier_id', NEW.supplier_id, 'old_status', OLD.status, 'new_status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
    VALUES (auth.uid(), 'SUPPLIER_DISASSOCIATED', 'client_suppliers', OLD.id::text, 'client',
      jsonb_build_object('client_id', OLD.client_id, 'supplier_id', OLD.supplier_id, 'status', OLD.status));
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_supplier_audit_trigger ON client_suppliers;

CREATE TRIGGER client_supplier_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON client_suppliers
FOR EACH ROW
EXECUTE FUNCTION log_client_supplier_changes();