-- CORREÇÃO CRÍTICA: Tabela NOTIFICATIONS - Corrigir políticas existentes
-- Adicionar client_id para segregar notificações por cliente (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'client_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN client_id uuid REFERENCES public.clients(id);
  END IF;
END $$;

-- Atualizar notificações existentes baseado no user_id
UPDATE public.notifications 
SET client_id = (
  SELECT p.client_id 
  FROM public.profiles p 
  WHERE p.id = notifications.user_id
)
WHERE client_id IS NULL;

-- Remover políticas antigas de notifications
DROP POLICY IF EXISTS notifications_filtered_select ON public.notifications;
DROP POLICY IF EXISTS notifications_system_can_create ON public.notifications;
DROP POLICY IF EXISTS notifications_user_can_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_user_can_update ON public.notifications;
DROP POLICY IF EXISTS notifications_secure_select ON public.notifications;
DROP POLICY IF EXISTS notifications_secure_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_secure_update ON public.notifications;

-- Criar políticas seguras para notifications
CREATE POLICY "notifications_secure_select" 
ON public.notifications 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR
  (get_user_role() = 'admin') OR
  (client_id = get_current_user_client_id())
);

CREATE POLICY "notifications_secure_insert" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) OR
  (get_user_role() = 'admin') OR
  (client_id = get_current_user_client_id())
);

CREATE POLICY "notifications_secure_update" 
ON public.notifications 
FOR UPDATE 
USING (
  (user_id = auth.uid()) AND 
  (client_id = get_current_user_client_id() OR get_user_role() = 'admin')
);