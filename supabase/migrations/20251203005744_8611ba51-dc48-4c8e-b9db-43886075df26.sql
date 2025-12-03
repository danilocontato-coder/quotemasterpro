-- Adicionar coluna para erro de transferência na tabela payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_error TEXT;

-- Criar tabela para rastrear transferências de fornecedores (histórico detalhado)
CREATE TABLE IF NOT EXISTS supplier_transfer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT REFERENCES payments(id),
  asaas_transfer_id TEXT,
  event_type TEXT NOT NULL, -- 'created', 'pending', 'done', 'failed', 'cancelled'
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_supplier_transfer_events_payment ON supplier_transfer_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transfer_events_asaas ON supplier_transfer_events(asaas_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_transfer ON payments(asaas_transfer_id);

-- RLS para supplier_transfer_events
ALTER TABLE supplier_transfer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to transfer events" ON supplier_transfer_events
FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Suppliers view own transfer events" ON supplier_transfer_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.id = supplier_transfer_events.payment_id 
    AND p.supplier_id = get_current_user_supplier_id()
  )
);

-- Comentário explicativo
COMMENT ON COLUMN payments.transfer_error IS 'Mensagem de erro caso a transferência PIX/TED falhe';
COMMENT ON TABLE supplier_transfer_events IS 'Histórico de eventos de transferências para fornecedores via Asaas';