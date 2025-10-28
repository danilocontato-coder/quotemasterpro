-- Adicionar coluna requires_approval na tabela clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;

COMMENT ON COLUMN clients.requires_approval IS 'Indica se o cliente requer aprovação para determinadas ações';