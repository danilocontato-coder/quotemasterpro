-- =====================================================
-- Adicionar suporte para chave PIX e transferências diretas
-- Remove dependência de asaas_wallet_id
-- =====================================================

-- 1. Adicionar coluna pix_key na tabela suppliers (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN pix_key TEXT;
    COMMENT ON COLUMN suppliers.pix_key IS 'Chave PIX do fornecedor (CPF, CNPJ, email, telefone ou EVP)';
  END IF;
END $$;

-- 2. Criar índice para busca rápida por chave PIX
CREATE INDEX IF NOT EXISTS idx_suppliers_pix_key ON suppliers(pix_key) WHERE pix_key IS NOT NULL;

-- 3. Criar tabela de erros de liberação de escrow (se não existir)
CREATE TABLE IF NOT EXISTS escrow_release_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  error_type TEXT NOT NULL, -- missing_bank_data, transfer_failed, invalid_data
  error_message TEXT NOT NULL,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_errors_payment ON escrow_release_errors(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_errors_retry ON escrow_release_errors(next_retry_at) 
  WHERE resolved_at IS NULL AND next_retry_at IS NOT NULL;

-- 4. Atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_escrow_errors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_escrow_errors_updated_at ON escrow_release_errors;
CREATE TRIGGER trg_escrow_errors_updated_at
  BEFORE UPDATE ON escrow_release_errors
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_errors_timestamp();

-- 5. Comentários explicativos
COMMENT ON TABLE escrow_release_errors IS 'Erros e tentativas de liberação de pagamentos em escrow';
COMMENT ON COLUMN escrow_release_errors.error_type IS 'Tipo de erro: missing_bank_data, transfer_failed, invalid_data';
COMMENT ON COLUMN escrow_release_errors.retry_count IS 'Número de tentativas de retry realizadas';
COMMENT ON COLUMN escrow_release_errors.next_retry_at IS 'Próxima tentativa agendada (exponential backoff)';