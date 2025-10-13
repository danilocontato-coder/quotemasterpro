-- Adicionar coluna tour_completed à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false;

-- Marcar usuários antigos como tour completo (criados há mais de 1 dia)
UPDATE public.profiles 
SET tour_completed = true 
WHERE created_at < NOW() - INTERVAL '1 day' AND tour_completed = false;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.tour_completed IS 'Indica se o usuário já completou o tour guiado inicial';