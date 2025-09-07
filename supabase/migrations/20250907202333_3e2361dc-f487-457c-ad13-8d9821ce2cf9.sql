-- Alterar status inicial dos tickets para 'novo' ao invés de 'open'
-- Primeiro, atualizar tickets existentes se necessário
UPDATE support_tickets 
SET status = 'novo' 
WHERE status = 'open' AND created_at > now() - interval '1 day';

-- Alterar o padrão da coluna para novos tickets
ALTER TABLE support_tickets 
ALTER COLUMN status SET DEFAULT 'novo';