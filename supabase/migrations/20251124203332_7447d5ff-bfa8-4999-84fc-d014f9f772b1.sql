-- Adicionar colunas financeiras à tabela payments para persistir valores calculados
-- Isso garante consistência e facilita auditoria futura

-- Adicionar colunas se não existirem
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS base_amount NUMERIC,
ADD COLUMN IF NOT EXISTS asaas_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS asaas_payment_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS asaas_messaging_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_net_amount NUMERIC;

-- Comentários explicativos
COMMENT ON COLUMN payments.base_amount IS 'Valor base da cotação (sem taxas Asaas)';
COMMENT ON COLUMN payments.asaas_fee IS 'Taxa total do Asaas (payment_fee + messaging_fee)';
COMMENT ON COLUMN payments.asaas_payment_fee IS 'Taxa de processamento do Asaas (PIX: R$ 0,99, Boleto: R$ 3,49, Cartão: 1.99% + R$ 0,49)';
COMMENT ON COLUMN payments.asaas_messaging_fee IS 'Taxa de mensageria do Asaas (R$ 0,99 por cobrança)';
COMMENT ON COLUMN payments.platform_commission IS 'Comissão da plataforma Cotiz (5% sobre base_amount)';
COMMENT ON COLUMN payments.supplier_net_amount IS 'Valor líquido que o fornecedor receberá (base_amount - platform_commission - asaas_fee)';

-- Atualizar payments existentes que ainda não têm os valores calculados
-- Assumir PIX (R$ 0,99 + R$ 0,99 = R$ 1,98) para pagamentos antigos
UPDATE payments
SET 
  base_amount = COALESCE(base_amount, amount - 1.98),
  asaas_fee = COALESCE(asaas_fee, 1.98),
  asaas_payment_fee = COALESCE(asaas_payment_fee, 0.99),
  asaas_messaging_fee = COALESCE(asaas_messaging_fee, 0.99),
  platform_commission = COALESCE(platform_commission, (amount - 1.98) * 0.05),
  supplier_net_amount = COALESCE(
    supplier_net_amount, 
    (amount - 1.98) * 0.95 - 1.98  -- base * 0.95 (após comissão) - taxas Asaas
  )
WHERE base_amount IS NULL OR supplier_net_amount IS NULL;