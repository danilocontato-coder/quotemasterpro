-- Adicionar colunas para rastreamento detalhado de valores de pagamento
-- Estas colunas permitem rastrear a estrutura completa de valores:
-- - Cliente paga: base_amount + asaas_fee
-- - Fornecedor recebe: base_amount - platform_commission

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS asaas_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS supplier_net_amount DECIMAL(10,2);

COMMENT ON COLUMN payments.base_amount IS 'Valor base da cotação (sem taxas Asaas)';
COMMENT ON COLUMN payments.asaas_fee IS 'Taxa cobrada pela Asaas (paga pelo cliente)';
COMMENT ON COLUMN payments.platform_commission IS 'Comissão da plataforma (paga pelo fornecedor, calculada sobre base_amount)';
COMMENT ON COLUMN payments.supplier_net_amount IS 'Valor líquido que o fornecedor recebe (base_amount - platform_commission)';
COMMENT ON COLUMN payments.amount IS 'Total pago pelo cliente (base_amount + asaas_fee)';
