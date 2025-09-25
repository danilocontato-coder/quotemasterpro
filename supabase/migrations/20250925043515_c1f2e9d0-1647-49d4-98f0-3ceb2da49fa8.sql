-- Habilitar RLS (idempotente)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Criar política de DELETE para permitir que fornecedores deletem usuários do próprio fornecedor e admins possam tudo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_delete_policy'
  ) THEN
    CREATE POLICY users_delete_policy
    ON public.users
    FOR DELETE
    USING (
      -- Admin pode deletar qualquer usuário
      public.get_user_role() = 'admin'
      OR 
      -- Fornecedor pode deletar usuários do mesmo supplier_id
      (supplier_id IN (
        SELECT profiles.supplier_id FROM public.profiles WHERE profiles.id = auth.uid()
      ))
      OR
      -- Clientes podem deletar usuários do mesmo client_id
      (client_id IN (
        SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid()
      ))
    );
  END IF;
END $$;
