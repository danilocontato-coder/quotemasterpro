-- Corrigir política RLS de notificações para isolamento por cliente
-- Problema: usuários viam notificações de clientes antigos após mudança de client_id
-- Solução: validar que client_id da notificação corresponde ao client_id atual do usuário

DROP POLICY IF EXISTS "notifications_secure_select" ON public.notifications;

CREATE POLICY "notifications_secure_select"
ON public.notifications
FOR SELECT
TO public
USING (
  -- Admin vê todas as notificações
  (get_user_role() = 'admin') OR
  -- Usuários veem APENAS notificações do seu cliente atual
  (user_id = auth.uid() AND client_id = get_current_user_client_id())
);