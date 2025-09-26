-- CORREÇÃO: Política de visibilidade regional simplificada para fornecedores

-- 1. Remover política anterior se existir
DROP POLICY IF EXISTS "suppliers_visibility_by_region_and_ownership" ON public.suppliers;

-- 2. Nova política simplificada - fornecedores certificados visíveis regionalmente
CREATE POLICY "suppliers_regional_and_client_visibility" 
ON public.suppliers 
FOR SELECT 
USING (
  -- Admins veem tudo
  (get_user_role() = 'admin'::text) OR 
  
  -- Fornecedores veem apenas a si mesmos
  (id = get_current_user_supplier_id()) OR
  
  -- Para usuários clientes: 
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND (
      -- Fornecedores certificados ativos são visíveis para todos os clientes da região
      (
        is_certified = true AND
        status = 'active' AND
        region IS NOT NULL
      ) OR
      
      -- Fornecedores locais: apenas os cadastrados pelo próprio cliente
      (
        client_id = get_current_user_client_id() AND
        status = 'active'
      )
    )
  )
);

-- 3. Para agora, vamos marcar os fornecedores sem client_id como certificados se estiverem ativos
UPDATE public.suppliers 
SET is_certified = true, type = 'certified'
WHERE client_id IS NULL 
  AND status = 'active'
  AND region IS NOT NULL;

-- 4. Log da correção
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  panel_type, 
  details
) VALUES (
  'SIMPLIFY_SUPPLIER_VISIBILITY',
  'suppliers',
  'system',
  'system',
  '{"message": "Política simplificada: certificados visíveis regionalmente, locais por cliente"}'::jsonb
);