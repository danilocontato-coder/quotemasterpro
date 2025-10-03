
-- ============================================
-- COMPLEMENTO: Políticas RLS para fornecedores na tabela users
-- ============================================

-- Verificar e criar política para fornecedores inserirem usuários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
      AND policyname = 'users_insert_as_supplier'
  ) THEN
    CREATE POLICY "users_insert_as_supplier"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
      supplier_id = get_current_user_supplier_id()
      AND supplier_id IS NOT NULL
      AND get_user_role() IN ('admin', 'manager')
    );
  END IF;
END $$;

-- Verificar e criar política para fornecedores excluírem usuários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
      AND policyname = 'users_delete_as_supplier'
  ) THEN
    CREATE POLICY "users_delete_as_supplier"
    ON public.users
    FOR DELETE
    TO authenticated
    USING (
      supplier_id = get_current_user_supplier_id()
      AND supplier_id IS NOT NULL
      AND get_user_role() IN ('admin', 'manager')
      AND auth.uid() != auth_user_id
    );
  END IF;
END $$;

-- Comentários explicativos
COMMENT ON TABLE public.users IS 
'Tabela de usuários com RLS habilitado. Usuários comuns só podem ver seu próprio perfil. Managers/Admins podem gerenciar usuários da mesma organização.';
