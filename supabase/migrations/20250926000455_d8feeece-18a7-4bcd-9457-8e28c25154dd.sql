-- CORREÇÃO CRÍTICA: Tabela NOTIFICATIONS não tem segregação por cliente
-- Adicionar client_id para segregar notificações por cliente
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

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

-- Trigger para auto-definir client_id em notifications
CREATE OR REPLACE FUNCTION public.trg_notifications_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id do usuário alvo se não especificado
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT p.client_id 
      FROM public.profiles p 
      WHERE p.id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_set_client_id ON public.notifications;
CREATE TRIGGER trg_notifications_set_client_id
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notifications_set_client_id();