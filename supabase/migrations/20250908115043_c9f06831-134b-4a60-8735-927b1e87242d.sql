-- 1) Criar tabela de associação user_group_memberships (se não existir)
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- 2) Habilitar RLS
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- 3) Políticas de RLS para user_group_memberships
DO $$ BEGIN
  -- Admin: ALL
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_group_memberships' AND policyname='user_group_memberships_admin_all'
  ) THEN
    CREATE POLICY "user_group_memberships_admin_all"
    ON public.user_group_memberships
    FOR ALL
    USING (public.get_user_role() = 'admin');
  END IF;

  -- INSERT: permitir admin ou grupos não-sistema
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_group_memberships' AND policyname='user_group_memberships_client_insert'
  ) THEN
    CREATE POLICY "user_group_memberships_client_insert"
    ON public.user_group_memberships
    FOR INSERT
    WITH CHECK (
      public.get_user_role() = 'admin' OR 
      EXISTS (
        SELECT 1 FROM public.user_groups ug 
        WHERE ug.id = user_group_memberships.group_id 
          AND COALESCE(ug.is_system_group, false) = false
      )
    );
  END IF;

  -- SELECT: admin ou usuários do mesmo cliente
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_group_memberships' AND policyname='user_group_memberships_client_select'
  ) THEN
    CREATE POLICY "user_group_memberships_client_select"
    ON public.user_group_memberships
    FOR SELECT
    USING (
      public.get_user_role() = 'admin' OR 
      user_id IN (
        SELECT u.id FROM public.users u 
        JOIN public.profiles p ON p.id = auth.uid() 
        WHERE u.client_id = p.client_id
      )
    );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_group_memberships' AND policyname='user_group_memberships_client_update'
  ) THEN
    CREATE POLICY "user_group_memberships_client_update"
    ON public.user_group_memberships
    FOR UPDATE
    USING (
      public.get_user_role() = 'admin' OR 
      EXISTS (
        SELECT 1 FROM public.user_groups ug 
        WHERE ug.id = user_group_memberships.group_id 
          AND COALESCE(ug.is_system_group, false) = false
      )
    );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_group_memberships' AND policyname='user_group_memberships_client_delete'
  ) THEN
    CREATE POLICY "user_group_memberships_client_delete"
    ON public.user_group_memberships
    FOR DELETE
    USING (
      public.get_user_role() = 'admin' OR 
      EXISTS (
        SELECT 1 FROM public.user_groups ug 
        WHERE ug.id = user_group_memberships.group_id 
          AND COALESCE(ug.is_system_group, false) = false
      )
    );
  END IF;
END $$;

-- 4) Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_group_memberships_updated_at'
  ) THEN
    CREATE TRIGGER update_user_group_memberships_updated_at
      BEFORE UPDATE ON public.user_group_memberships
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Ajustar política de SELECT de user_groups para permitir visualização por usuários autenticados
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_groups' AND policyname='user_groups_restricted_select'
  ) THEN
    DROP POLICY "user_groups_restricted_select" ON public.user_groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_groups' AND policyname='user_groups_select_authenticated'
  ) THEN
    CREATE POLICY "user_groups_select_authenticated"
    ON public.user_groups
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 6) Inserir grupos padrão do sistema apenas se não existirem
INSERT INTO public.user_groups (name, description, color, permissions, is_system_group, user_count)
SELECT * FROM (
  VALUES 
    ('Administradores', 'Acesso total ao sistema', '#dc2626', ARRAY['all']::text[], true, 0),
    ('Gestores', 'Gerenciamento de cotações e aprovações', '#2563eb', ARRAY['quotes.create','quotes.edit','quotes.approve','suppliers.manage','payments.view']::text[], true, 0),
    ('Colaboradores', 'Criação e visualização de cotações', '#16a34a', ARRAY['quotes.create','quotes.view','suppliers.view','products.view']::text[], true, 0)
) AS v(name, description, color, permissions, is_system_group, user_count)
WHERE NOT EXISTS (SELECT 1 FROM public.user_groups g WHERE g.name = v.name);

-- 7) Índices de performance
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group_id ON public.user_group_memberships(group_id);
