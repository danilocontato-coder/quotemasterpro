-- 1. Corrigir políticas RLS da tabela suppliers (tornar PERMISSIVE)

-- Admin: PERMISSIVE em todos os comandos
DROP POLICY IF EXISTS suppliers_admin_full_access ON public.suppliers;
CREATE POLICY suppliers_admin_full_access ON public.suppliers
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.has_role_text(auth.uid(), 'admin'))
WITH CHECK (public.has_role_text(auth.uid(), 'admin'));

-- Cliente cria fornecedor local: PERMISSIVE
DROP POLICY IF EXISTS suppliers_client_create_local ON public.suppliers;
CREATE POLICY suppliers_client_create_local ON public.suppliers
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  user_has_module_access('suppliers')
  AND auth.uid() IS NOT NULL
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- Cliente atualiza fornecedor local: PERMISSIVE
DROP POLICY IF EXISTS suppliers_client_update_local ON public.suppliers;
CREATE POLICY suppliers_client_update_local ON public.suppliers
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
)
WITH CHECK (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- Cliente remove fornecedor local: PERMISSIVE
DROP POLICY IF EXISTS suppliers_client_delete_local ON public.suppliers;
CREATE POLICY suppliers_client_delete_local ON public.suppliers
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  user_has_module_access('suppliers')
  AND client_id = get_current_user_client_id()
  AND type = 'local'
);

-- Cliente visualiza fornecedores associados: PERMISSIVE
DROP POLICY IF EXISTS suppliers_client_view_associated ON public.suppliers;
CREATE POLICY suppliers_client_view_associated ON public.suppliers
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  user_has_module_access('suppliers')
  AND get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
      AND cs.status = 'active'
  )
);

-- Garantir que as políticas de fornecedor próprio também sejam PERMISSIVE
DROP POLICY IF EXISTS suppliers_own_update ON public.suppliers;
CREATE POLICY suppliers_own_update ON public.suppliers
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (id = get_current_user_supplier_id())
WITH CHECK (id = get_current_user_supplier_id());

DROP POLICY IF EXISTS suppliers_own_view_edit ON public.suppliers;
CREATE POLICY suppliers_own_view_edit ON public.suppliers
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id = get_current_user_supplier_id());

-- 2. Promover o usuário atual a admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('d9535a0a-aab8-4c53-8cef-103219db6947', 'admin')
ON CONFLICT DO NOTHING;