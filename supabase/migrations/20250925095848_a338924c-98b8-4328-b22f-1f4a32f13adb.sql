-- Função security definer para obter data de criação do usuário (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.get_user_created_at()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT created_at FROM public.profiles WHERE id = auth.uid();
$$;

-- Remover políticas existentes para notificações
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_after_user_creation" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_create" ON public.notifications;

-- Nova política SELECT que filtra notificações por data de criação do usuário
CREATE POLICY "notifications_filtered_select" ON public.notifications
FOR SELECT USING (
  user_id = auth.uid() AND
  created_at >= COALESCE(get_user_created_at(), now())
);

-- Políticas para INSERT/UPDATE
CREATE POLICY "notifications_user_can_insert" ON public.notifications
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_user_can_update" ON public.notifications  
FOR UPDATE USING (user_id = auth.uid());

-- Política para sistema/triggers (sem verificação de usuário)
CREATE POLICY "notifications_system_can_create" ON public.notifications
FOR INSERT WITH CHECK (true);