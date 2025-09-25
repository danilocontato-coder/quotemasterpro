-- Corrigir políticas RLS para notificações para filtrar por data de criação do usuário
-- Remover todas as políticas existentes primeiro

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON public.notifications;

-- Criar nova política SELECT que filtra notificações por data de criação do usuário
CREATE POLICY "notifications_select_after_user_creation" ON public.notifications
FOR SELECT USING (
  user_id = auth.uid() AND
  -- Só mostrar notificações criadas após a criação do perfil do usuário
  created_at >= COALESCE(
    (SELECT created_at FROM public.profiles WHERE id = auth.uid()),
    -- Fallback: usar data atual se não houver profile
    now()
  )
);

-- Política para permitir que usuários insiram suas próprias notificações
CREATE POLICY "notifications_user_insert" ON public.notifications
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para permitir que usuários atualizem suas próprias notificações (marcar como lida)
CREATE POLICY "notifications_user_update" ON public.notifications  
FOR UPDATE USING (user_id = auth.uid());

-- Política especial para sistema/triggers criarem notificações
CREATE POLICY "notifications_system_create" ON public.notifications
FOR INSERT WITH CHECK (true);