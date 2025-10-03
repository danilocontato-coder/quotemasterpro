
-- ============================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS da tabela users
-- ============================================
-- Esta migração corrige as políticas RLS para proteger informações
-- de contato dos usuários contra acesso não autorizado.
--
-- ANTES: Qualquer usuário do mesmo cliente podia ver todos os dados
-- DEPOIS: Usuários só veem seus próprios dados, exceto admins e 
--         usuários com permissões específicas de gerenciamento
-- ============================================

-- Remover políticas antigas inseguras
DROP POLICY IF EXISTS "users_client_view" ON public.users;
DROP POLICY IF EXISTS "users_supplier_management" ON public.users;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_select_as_admin" ON public.users;
DROP POLICY IF EXISTS "users_select_as_manager" ON public.users;
DROP POLICY IF EXISTS "users_insert_restricted" ON public.users;
DROP POLICY IF EXISTS "users_update_own_basic_info" ON public.users;
DROP POLICY IF EXISTS "users_update_as_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_as_manager" ON public.users;
DROP POLICY IF EXISTS "users_delete_restricted" ON public.users;
DROP POLICY IF EXISTS "users_supplier_select" ON public.users;
DROP POLICY IF EXISTS "users_supplier_manage" ON public.users;

-- ============================================
-- POLÍTICAS DE SELECT (Visualização)
-- ============================================

-- 1. Usuários podem ver apenas seu próprio perfil
CREATE POLICY "users_select_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
);

-- 2. Administradores podem ver todos os usuários
CREATE POLICY "users_select_as_admin"
ON public.users
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'admin'
);

-- 3. Managers podem ver usuários do mesmo cliente (com módulo de usuários habilitado)
CREATE POLICY "users_select_as_manager"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_has_module_access('user_management') 
  AND client_id = get_current_user_client_id()
  AND get_user_role() = 'manager'
);

-- 4. Fornecedores podem ver usuários do próprio fornecedor
CREATE POLICY "users_select_as_supplier"
ON public.users
FOR SELECT
TO authenticated
USING (
  supplier_id = get_current_user_supplier_id()
  AND supplier_id IS NOT NULL
);

-- ============================================
-- POLÍTICAS DE INSERT (Criação)
-- ============================================

-- Apenas admins e managers podem criar novos usuários
CREATE POLICY "users_insert_restricted"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_module_access('user_management')
  AND (
    get_user_role() = 'admin' 
    OR (
      get_user_role() = 'manager' 
      AND client_id = get_current_user_client_id()
    )
  )
);

-- ============================================
-- POLÍTICAS DE UPDATE (Atualização)
-- ============================================

-- 1. Usuários podem atualizar apenas seu próprio perfil (dados básicos)
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
)
WITH CHECK (
  auth.uid() = auth_user_id
);

-- 2. Admins podem atualizar qualquer usuário
CREATE POLICY "users_update_as_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  get_user_role() = 'admin'
)
WITH CHECK (
  get_user_role() = 'admin'
);

-- 3. Managers podem atualizar usuários do mesmo cliente
CREATE POLICY "users_update_as_manager"
ON public.users
FOR UPDATE
TO authenticated
USING (
  user_has_module_access('user_management')
  AND get_user_role() = 'manager'
  AND client_id = get_current_user_client_id()
)
WITH CHECK (
  user_has_module_access('user_management')
  AND get_user_role() = 'manager'
  AND client_id = get_current_user_client_id()
);

-- 4. Fornecedores podem atualizar usuários do próprio fornecedor
CREATE POLICY "users_update_as_supplier"
ON public.users
FOR UPDATE
TO authenticated
USING (
  supplier_id = get_current_user_supplier_id()
  AND supplier_id IS NOT NULL
  AND get_user_role() IN ('admin', 'manager')
)
WITH CHECK (
  supplier_id = get_current_user_supplier_id()
  AND supplier_id IS NOT NULL
);

-- ============================================
-- POLÍTICAS DE DELETE (Exclusão)
-- ============================================

-- Apenas admins e managers podem excluir usuários
CREATE POLICY "users_delete_restricted"
ON public.users
FOR DELETE
TO authenticated
USING (
  user_has_module_access('user_management')
  AND (
    get_user_role() = 'admin'
    OR (
      get_user_role() = 'manager'
      AND client_id = get_current_user_client_id()
      -- Impedir que manager delete a si mesmo
      AND auth.uid() != auth_user_id
    )
  )
);

-- ============================================
-- COMENTÁRIOS DE AUDITORIA
-- ============================================

COMMENT ON POLICY "users_select_own_profile" ON public.users IS 
'SECURITY: Usuários só podem ver seu próprio perfil, protegendo dados de contato de outros usuários';

COMMENT ON POLICY "users_select_as_manager" ON public.users IS 
'SECURITY: Managers com módulo user_management podem ver usuários do mesmo cliente';

COMMENT ON POLICY "users_update_own_profile" ON public.users IS 
'SECURITY: Usuários podem atualizar apenas seu próprio perfil';

COMMENT ON POLICY "users_delete_restricted" ON public.users IS 
'SECURITY: Impede que managers excluam a si mesmos';
