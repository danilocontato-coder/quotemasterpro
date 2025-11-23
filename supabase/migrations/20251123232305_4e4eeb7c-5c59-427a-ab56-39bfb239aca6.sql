-- =====================================================
-- FASE 1: Infraestrutura - Fluxo de Cobrança pelo Fornecedor
-- =====================================================

-- 1.1. Adicionar campos para rastreamento de emissão pelo fornecedor
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ;

-- 1.2. Criar flag de transição para novos clientes
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS supplier_issues_invoice BOOLEAN DEFAULT true;

COMMENT ON COLUMN payments.issued_by IS 'Fornecedor que emitiu a cobrança (novo fluxo)';
COMMENT ON COLUMN payments.invoice_number IS 'Número da NF-e ou invoice vinculada à cobrança';
COMMENT ON COLUMN payments.invoice_issued_at IS 'Data/hora em que o fornecedor emitiu a cobrança';
COMMENT ON COLUMN clients.supplier_issues_invoice IS 'Se true, fornecedor emite cobrança. Se false, usa fluxo legado (cliente gera pagamento)';

-- 1.3. Adicionar índice para buscar cobranças por fornecedor
CREATE INDEX IF NOT EXISTS idx_payments_issued_by 
  ON payments(issued_by) 
  WHERE issued_by IS NOT NULL;

-- 1.4. Adicionar colunas detalhadas de taxas Asaas (descobertas no extrato)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS asaas_payment_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS asaas_messaging_fee NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN payments.asaas_payment_fee IS 'Taxa de pagamento do Asaas (PIX R$0.99, Boleto R$3.49, Cartão 1.99%+R$0.49)';
COMMENT ON COLUMN payments.asaas_messaging_fee IS 'Taxa de mensageria do Asaas (R$0.99 por cobrança)';

-- 1.5. Log de auditoria
INSERT INTO audit_logs (
  action,
  entity_type,
  entity_id,
  details
) VALUES (
  'PAYMENT_FLOW_INFRASTRUCTURE_CREATED',
  'system',
  'payments',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'Added issued_by column for supplier-initiated payments',
      'Added invoice tracking columns',
      'Added supplier_issues_invoice flag to clients',
      'Added detailed Asaas fee columns (asaas_payment_fee, asaas_messaging_fee)'
    ),
    'migration_date', now()
  )
);