-- Criar tabela de cupons
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC,
  minimum_purchase_amount NUMERIC DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  target_plans TEXT[] DEFAULT '{}',
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'new_customers', 'existing_customers')),
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de usos de cupons
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id),
  subscription_plan_id TEXT,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cupons
CREATE POLICY "Admins can manage all coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "Public can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (active = true AND starts_at <= now() AND (expires_at IS NULL OR expires_at > now()));

-- Políticas RLS para usos de cupons
CREATE POLICY "Admins can view all coupon usages"
ON public.coupon_usages
FOR SELECT
TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert coupon usages"
ON public.coupon_usages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger para incrementar usage_count quando cupom é usado
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons 
  SET usage_count = usage_count + 1
  WHERE id = NEW.coupon_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_coupon_usage_trigger
  AFTER INSERT ON public.coupon_usages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();

-- Função para validar cupom
CREATE OR REPLACE FUNCTION public.validate_coupon(
  coupon_code TEXT,
  user_uuid UUID DEFAULT auth.uid(),
  plan_id TEXT DEFAULT NULL,
  purchase_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  max_discount_amount NUMERIC,
  final_discount NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_record RECORD;
  calculated_discount NUMERIC := 0;
  user_usage_count INTEGER := 0;
BEGIN
  -- Buscar cupom
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = coupon_code;
  
  -- Verificar se cupom existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Cupom não encontrado';
    RETURN;
  END IF;
  
  -- Verificar se cupom está ativo
  IF NOT coupon_record.active THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Cupom inativo';
    RETURN;
  END IF;
  
  -- Verificar data de início
  IF coupon_record.starts_at > now() THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Cupom ainda não está válido';
    RETURN;
  END IF;
  
  -- Verificar expiração
  IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < now() THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Cupom expirado';
    RETURN;
  END IF;
  
  -- Verificar limite de uso geral
  IF coupon_record.usage_limit IS NOT NULL AND coupon_record.usage_count >= coupon_record.usage_limit THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Limite de uso do cupom atingido';
    RETURN;
  END IF;
  
  -- Verificar uso por usuário (máximo 1 por usuário)
  SELECT COUNT(*) INTO user_usage_count
  FROM public.coupon_usages
  WHERE coupon_id = coupon_record.id AND user_id = user_uuid;
  
  IF user_usage_count > 0 THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Você já usou este cupom';
    RETURN;
  END IF;
  
  -- Verificar valor mínimo
  IF purchase_amount < coupon_record.minimum_purchase_amount THEN
    RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 
      format('Valor mínimo de compra: R$ %.2f', coupon_record.minimum_purchase_amount);
    RETURN;
  END IF;
  
  -- Verificar planos específicos
  IF plan_id IS NOT NULL AND array_length(coupon_record.target_plans, 1) > 0 THEN
    IF NOT (plan_id = ANY(coupon_record.target_plans)) THEN
      RETURN QUERY SELECT false, coupon_record.id, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 0::NUMERIC, 'Cupom não válido para este plano';
      RETURN;
    END IF;
  END IF;
  
  -- Calcular desconto
  IF coupon_record.discount_type = 'percentage' THEN
    calculated_discount := purchase_amount * (coupon_record.discount_value / 100);
    IF coupon_record.max_discount_amount IS NOT NULL THEN
      calculated_discount := LEAST(calculated_discount, coupon_record.max_discount_amount);
    END IF;
  ELSE -- fixed_amount
    calculated_discount := coupon_record.discount_value;
  END IF;
  
  -- Garantir que desconto não seja maior que o valor da compra
  calculated_discount := LEAST(calculated_discount, purchase_amount);
  
  RETURN QUERY SELECT true, coupon_record.id, coupon_record.discount_type, 
    coupon_record.discount_value, coupon_record.max_discount_amount, calculated_discount, NULL::TEXT;
END;
$$;