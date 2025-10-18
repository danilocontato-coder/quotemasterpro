-- Criar tabela para estados de notificação por usuário
CREATE TABLE IF NOT EXISTS public.notification_user_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.notification_user_states ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê seus próprios estados
CREATE POLICY "Users can view own notification states"
ON public.notification_user_states
FOR SELECT
USING (user_id = auth.uid());

-- Política: usuário só insere seus próprios estados
CREATE POLICY "Users can insert own notification states"
ON public.notification_user_states
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Política: usuário só atualiza seus próprios estados
CREATE POLICY "Users can update own notification states"
ON public.notification_user_states
FOR UPDATE
USING (user_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_user_states_user_id 
ON public.notification_user_states(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_user_states_notification_id 
ON public.notification_user_states(notification_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_user_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_user_states_timestamp
BEFORE UPDATE ON public.notification_user_states
FOR EACH ROW
EXECUTE FUNCTION update_notification_user_states_updated_at();