-- FASE 3: Adicionar constraint UNIQUE para prevenir múltiplos pagamentos para a mesma cotação
-- Isso impede duplicações no nível do banco de dados

-- Primeiro, limpar possíveis duplicatas existentes (manter apenas o mais recente)
WITH duplicates AS (
  SELECT id, quote_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY quote_id ORDER BY created_at DESC) as rn
  FROM payments
  WHERE status != 'cancelled'
)
UPDATE payments
SET status = 'cancelled'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Adicionar constraint UNIQUE em quote_id
ALTER TABLE payments 
ADD CONSTRAINT payments_quote_id_unique 
UNIQUE (quote_id);

-- Criar índice para performance em queries comuns
CREATE INDEX IF NOT EXISTS idx_payments_quote_id_status 
ON payments(quote_id, status) 
WHERE status != 'cancelled';

-- Comentário explicativo
COMMENT ON CONSTRAINT payments_quote_id_unique ON payments IS 
'Garante que cada cotação tenha no máximo um pagamento ativo. Previne duplicações.';