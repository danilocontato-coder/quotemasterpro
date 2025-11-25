-- =====================================================
-- Remover trigger que recalcula comissão incorretamente
-- =====================================================
-- Este trigger estava usando 'amount' (que inclui taxas Asaas)
-- em vez de 'base_amount' para calcular supplier_net_amount,
-- causando cálculos incorretos.
-- 
-- Os valores já são calculados corretamente no edge function
-- supplier-issue-invoice usando a fórmula correta:
-- supplier_net_amount = base_amount - platform_commission
-- =====================================================

DROP TRIGGER IF EXISTS trigger_calculate_payment_commission ON payments;
DROP FUNCTION IF EXISTS calculate_payment_commission();

-- Log de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger removido com sucesso';
  RAISE NOTICE '💡 Valores agora são calculados apenas no edge function';
  RAISE NOTICE '📝 Fórmula correta: supplier_net = base_amount - platform_commission';
END $$;