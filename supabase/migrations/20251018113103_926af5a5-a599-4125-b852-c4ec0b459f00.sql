-- Primeiro, limpar registros órfãos em cost_centers
DELETE FROM public.cost_centers
WHERE client_id NOT IN (SELECT id FROM public.clients);

-- Agora aplicar as constraints com ON DELETE CASCADE
-- user_settings.client_id
ALTER TABLE public.user_settings 
DROP CONSTRAINT IF EXISTS user_settings_client_id_fkey;

ALTER TABLE public.user_settings 
ADD CONSTRAINT user_settings_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- notifications.client_id
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_client_id_fkey;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- client_usage.client_id
ALTER TABLE public.client_usage 
DROP CONSTRAINT IF EXISTS client_usage_client_id_fkey;

ALTER TABLE public.client_usage 
ADD CONSTRAINT client_usage_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- ai_credits.client_id
ALTER TABLE public.ai_credits 
DROP CONSTRAINT IF EXISTS ai_credits_client_id_fkey;

ALTER TABLE public.ai_credits 
ADD CONSTRAINT ai_credits_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- cost_centers.client_id
ALTER TABLE public.cost_centers 
DROP CONSTRAINT IF EXISTS cost_centers_client_id_fkey;

ALTER TABLE public.cost_centers 
ADD CONSTRAINT cost_centers_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;