
-- Corrigir search_path da função de cálculo de comissão
CREATE OR REPLACE FUNCTION calculate_payment_commission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
