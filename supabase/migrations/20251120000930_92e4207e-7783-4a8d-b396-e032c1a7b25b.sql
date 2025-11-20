-- Fase 2.1: Adicionar campos de comissão à tabela payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS platform_commission_percentage DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS platform_commission_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS supplier_net_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS split_applied BOOLEAN DEFAULT FALSE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN payments.platform_commission_percentage IS 'Percentual de comissão da plataforma (ex: 5.0%)';
COMMENT ON COLUMN payments.platform_commission_amount IS 'Valor em R$ da comissão retida pela plataforma';
COMMENT ON COLUMN payments.supplier_net_amount IS 'Valor líquido recebido pelo fornecedor após comissão';
COMMENT ON COLUMN payments.split_applied IS 'Indica se o split foi aplicado com sucesso no Asaas';

-- Atualizar pagamentos existentes com valores retroativos (5% de comissão padrão)
UPDATE payments
SET 
  platform_commission_percentage = 5.0,
  platform_commission_amount = amount * 0.05,
  supplier_net_amount = amount * 0.95,
  split_applied = FALSE
WHERE platform_commission_percentage IS NULL;