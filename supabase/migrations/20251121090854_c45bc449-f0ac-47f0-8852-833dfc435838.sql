
-- Atualizar pagamentos existentes com cálculos de comissão
UPDATE payments
SET 
  platform_commission_amount = amount * (COALESCE(platform_commission_percentage, 5.0) / 100),
  supplier_net_amount = amount * (1 - (COALESCE(platform_commission_percentage, 5.0) / 100))
WHERE platform_commission_amount IS NULL 
   OR supplier_net_amount IS NULL;

-- Criar função para calcular automaticamente os valores de comissão
CREATE OR REPLACE FUNCTION calculate_payment_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a comissão não foi definida, usar 5% como padrão
  IF NEW.platform_commission_percentage IS NULL THEN
    NEW.platform_commission_percentage := 5.0;
  END IF;

  -- Calcular comissão e valor líquido automaticamente
  NEW.platform_commission_amount := NEW.amount * (NEW.platform_commission_percentage / 100);
  NEW.supplier_net_amount := NEW.amount * (1 - (NEW.platform_commission_percentage / 100));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular comissão em INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_calculate_payment_commission ON payments;
CREATE TRIGGER trigger_calculate_payment_commission
  BEFORE INSERT OR UPDATE OF amount, platform_commission_percentage
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_payment_commission();

-- Comentários para documentação
COMMENT ON FUNCTION calculate_payment_commission() IS 
'Calcula automaticamente a comissão da plataforma e o valor líquido do fornecedor';

COMMENT ON TRIGGER trigger_calculate_payment_commission ON payments IS 
'Trigger que garante que platform_commission_amount e supplier_net_amount sejam sempre calculados';
