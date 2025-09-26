-- Adicionar campo para marcar template como padrão
ALTER TABLE whatsapp_templates ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Criar índice único para garantir apenas um template padrão por tipo e escopo
CREATE UNIQUE INDEX idx_whatsapp_templates_default_global 
ON whatsapp_templates (template_type, is_global) 
WHERE is_default = true AND is_global = true;

CREATE UNIQUE INDEX idx_whatsapp_templates_default_client 
ON whatsapp_templates (template_type, client_id) 
WHERE is_default = true AND is_global = false AND client_id IS NOT NULL;

-- Comentário sobre a lógica:
-- Um template padrão por tipo globalmente (is_global = true)
-- Um template padrão por tipo por cliente (client_id específico)