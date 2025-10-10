-- Adicionar colunas de status de registro na tabela suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending_registration';

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMP WITH TIME ZONE;

-- Índice para buscar fornecedores pendentes (performance)
CREATE INDEX IF NOT EXISTS idx_suppliers_registration_status 
ON suppliers(registration_status) 
WHERE registration_status = 'pending_registration';

-- Atualizar fornecedores existentes com CNPJ válido para 'active'
UPDATE suppliers
SET 
  registration_status = 'active',
  registration_completed_at = created_at
WHERE 
  cnpj IS NOT NULL 
  AND cnpj != '' 
  AND registration_status = 'pending_registration';

-- Comentários para documentação
COMMENT ON COLUMN suppliers.registration_status IS 'Status do cadastro do fornecedor: pending_registration, active, inactive, suspended';
COMMENT ON COLUMN suppliers.registration_completed_at IS 'Data e hora em que o fornecedor completou o cadastro completo';