-- Corrigir as últimas funções com search_path inseguro

CREATE OR REPLACE FUNCTION public.validate_coupon(
  coupon_code text, 
  user_uuid uuid DEFAULT auth.uid(), 
  plan_id text DEFAULT NULL::text, 
  purchase_amount numeric DEFAULT 0
)
RETURNS TABLE(
  valid boolean, 
  coupon_id uuid, 
  discount_type text, 
  discount_value numeric, 
  max_discount_amount numeric, 
  final_discount numeric, 
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.current_user_can_see_quote(quote_id_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_id_param AND (
      -- Admin can see all
      public.get_user_role() = 'admin'::text OR
      -- Client members can see their quotes
      q.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid()) OR
      -- Quote creator
      q.created_by = auth.uid() OR
      -- Direct supplier assignment on quotes table
      q.supplier_id = public.get_current_user_supplier_id() OR
      -- Supplier explicitly mapped via quote_suppliers
      EXISTS (
        SELECT 1 FROM public.quote_suppliers qs 
        WHERE qs.quote_id = q.id AND qs.supplier_id = public.get_current_user_supplier_id()
      ) OR
      -- Supplier that already responded
      EXISTS (
        SELECT 1 FROM public.quote_responses qr 
        WHERE qr.quote_id = q.id AND qr.supplier_id = public.get_current_user_supplier_id()
      ) OR
      -- Open quotes to all suppliers (accept both 'global' and 'all')
      (q.supplier_scope IN ('global','all') AND q.status IN ('sent','receiving') AND public.get_user_role() = 'supplier'::text) OR
      -- Local quotes open (not targeted to a specific supplier)
      (q.supplier_scope = 'local' AND q.supplier_id IS NULL AND q.status IN ('sent','receiving') AND public.get_user_role() = 'supplier'::text) OR
      -- Selected suppliers via array field
      (
        public.get_current_user_supplier_id() IS NOT NULL 
        AND q.selected_supplier_ids IS NOT NULL 
        AND public.get_current_user_supplier_id() = ANY(q.selected_supplier_ids)
      )
    )
  );
END;
$function$;