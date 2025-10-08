-- Adicionar coluna branding_settings_id à tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS branding_settings_id UUID REFERENCES public.branding_settings(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_branding_settings 
ON public.clients(branding_settings_id) 
WHERE branding_settings_id IS NOT NULL;

-- Adicionar comentário descritivo
COMMENT ON COLUMN public.clients.branding_settings_id IS 'ID das configurações de branding personalizadas. Condomínios vinculados herdam da administradora se não tiverem próprio.';
