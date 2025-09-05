-- Add setting for auto-reject notifications
INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES (
  'auto_notify_rejected_proposals', 
  '{"enabled": true, "message_template": "Sua proposta para \"{quote_title}\" não foi selecionada. Outra proposta foi aprovada pelo cliente."}',
  'Configuração para notificar automaticamente fornecedores quando suas propostas são reprovadas'
) ON CONFLICT (setting_key) DO NOTHING;

-- Add client-specific setting capability
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"auto_notify_rejected_proposals": true}'::jsonb;