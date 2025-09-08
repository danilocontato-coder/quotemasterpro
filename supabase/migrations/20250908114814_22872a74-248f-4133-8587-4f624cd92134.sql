-- Criar tabela de membros dos grupos de usuários
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Habilitar RLS
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para user_group_memberships
CREATE POLICY "user_group_memberships_admin_all" 
ON public.user_group_memberships 
FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "user_group_memberships_client_insert" 
ON public.user_group_memberships 
FOR INSERT 
WITH CHECK (
  get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.user_groups ug 
    WHERE ug.id = user_group_memberships.group_id 
    AND NOT ug.is_system_group
  )
);

CREATE POLICY "user_group_memberships_client_select" 
ON public.user_group_memberships 
FOR SELECT 
USING (
  get_user_role() = 'admin' OR 
  user_id IN (
    SELECT u.id FROM public.users u 
    JOIN public.profiles p ON p.id = auth.uid() 
    WHERE u.client_id = p.client_id
  )
);

CREATE POLICY "user_group_memberships_client_update" 
ON public.user_group_memberships 
FOR UPDATE 
USING (
  get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.user_groups ug 
    WHERE ug.id = user_group_memberships.group_id 
    AND NOT ug.is_system_group
  )
);

CREATE POLICY "user_group_memberships_client_delete" 
ON public.user_group_memberships 
FOR DELETE 
USING (
  get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.user_groups ug 
    WHERE ug.id = user_group_memberships.group_id 
    AND NOT ug.is_system_group
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_group_memberships_updated_at
  BEFORE UPDATE ON public.user_group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grupos padrão do sistema (se não existirem)
INSERT INTO public.user_groups (name, description, color, permissions, is_system_group, user_count)
VALUES 
  ('Administradores', 'Acesso total ao sistema', '#dc2626', ARRAY['all'], true, 0),
  ('Gestores', 'Gerenciamento de cotações e aprovações', '#2563eb', ARRAY['quotes.create', 'quotes.edit', 'quotes.approve', 'suppliers.manage', 'payments.view'], true, 0),
  ('Colaboradores', 'Criação e visualização de cotações', '#16a34a', ARRAY['quotes.create', 'quotes.view', 'suppliers.view', 'products.view'], true, 0)
ON CONFLICT (name) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group_id ON public.user_group_memberships(group_id);