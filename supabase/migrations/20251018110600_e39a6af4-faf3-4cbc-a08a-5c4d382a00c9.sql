-- Alinhar política RLS de suppliers com clients
-- Usar get_user_role() que já converte super_admin → 'admin'

-- 1. Remover política antiga que usa has_role_text()
DROP POLICY IF EXISTS "suppliers_admin_full_access" ON public.suppliers;

-- 2. Criar nova política alinhada com o padrão do módulo clients
CREATE POLICY "suppliers_admin_full_access"
ON public.suppliers
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');