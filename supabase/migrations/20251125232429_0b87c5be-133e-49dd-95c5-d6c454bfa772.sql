-- =====================================================
-- Corrigir modelo financeiro em 3 etapas
-- =====================================================
-- Etapa 1: Remover constraint antiga
-- Etapa 2: Recalcular supplier_net_amount
-- Etapa 3: Adicionar constraint correta
-- =====================================================

-- Etapa 1: Remover a constraint antiga
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS check_supplier_net_valid;

-- Etapa 2: Recalcular supplier_net_amount corretamente
-- Fornecedor recebe: base_amount - platform_commission (SEM descontar asaas_fee)
UPDATE payments
SET 
  supplier_net_amount = base_amount - platform_commission,
  updated_at = now()
WHERE 
  base_amount IS NOT NULL 
  AND platform_commission IS NOT NULL
  AND supplier_net_amount IS NOT NULL;

-- Etapa 3: Adicionar a constraint correta
ALTER TABLE payments 
ADD CONSTRAINT check_supplier_net_valid 
CHECK (
  supplier_net_amount IS NULL 
  OR abs(supplier_net_amount - (base_amount - platform_commission)) < 0.01
);

-- Log de verificação
DO $$
DECLARE
  fixed_count INTEGER;
  payment_sample RECORD;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM payments
  WHERE base_amount IS NOT NULL;
  
  RAISE NOTICE '===================================================';
  RAISE NOTICE '✅ % pagamentos recalculados com o modelo correto', fixed_count;
  RAISE NOTICE '===================================================';
  RAISE NOTICE '📝 Nova fórmula: supplier_net = base - comissão';
  RAISE NOTICE '💡 Cliente paga: base + taxas Asaas';
  RAISE NOTICE '💰 Fornecedor recebe: base - comissão (5%%)';
  RAISE NOTICE '===================================================';
  
  -- Mostrar um exemplo de cálculo
  SELECT 
    id, 
    base_amount, 
    platform_commission, 
    supplier_net_amount,
    asaas_fee
  INTO payment_sample
  FROM payments
  WHERE base_amount IS NOT NULL
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE 'Exemplo: PAY%', payment_sample.id;
    RAISE NOTICE '  Base: R$ %.2f', payment_sample.base_amount;
    RAISE NOTICE '  Comissão: R$ %.2f', payment_sample.platform_commission;
    RAISE NOTICE '  Fornecedor Líquido: R$ %.2f', payment_sample.supplier_net_amount;
    RAISE NOTICE '  (Taxas Asaas R$ %.2f são pagas pelo cliente)', payment_sample.asaas_fee;
  END IF;
END $$;