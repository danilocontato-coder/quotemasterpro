-- ============================================
-- MIGRAÇÃO: Reset de uso baseado em billing cycle
-- ============================================

-- Etapa 1: Criar função para calcular início do billing period
CREATE OR REPLACE FUNCTION public.get_billing_period_start(
  p_client_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_billing_cycle TEXT;
  v_result_date DATE;
  v_month_diff INTEGER;
BEGIN
  -- Buscar current_period_start e billing_cycle da assinatura
  SELECT 
    s.current_period_start,
    s.billing_cycle
  INTO v_period_start, v_billing_cycle
  FROM public.subscriptions s
  WHERE s.client_id = p_client_id
    AND s.status IN ('active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Se não encontrou assinatura, retorna início do mês civil
  IF v_period_start IS NULL THEN
    RETURN date_trunc('month', p_reference_date)::DATE;
  END IF;

  -- Extrair apenas a data (ignorar timezone)
  v_result_date := v_period_start::DATE;

  -- Calcular quantos ciclos se passaram desde o início
  IF v_billing_cycle = 'monthly' THEN
    v_month_diff := EXTRACT(YEAR FROM AGE(p_reference_date, v_result_date)) * 12 
                   + EXTRACT(MONTH FROM AGE(p_reference_date, v_result_date));
    v_result_date := (v_period_start + (v_month_diff || ' months')::INTERVAL)::DATE;
  ELSIF v_billing_cycle = 'yearly' THEN
    v_month_diff := EXTRACT(YEAR FROM AGE(p_reference_date, v_result_date)) * 12;
    v_result_date := (v_period_start + (v_month_diff || ' months')::INTERVAL)::DATE;
  END IF;

  -- Garantir que não retorna data futura
  IF v_result_date > p_reference_date THEN
    IF v_billing_cycle = 'monthly' THEN
      v_result_date := (v_result_date - INTERVAL '1 month')::DATE;
    ELSIF v_billing_cycle = 'yearly' THEN
      v_result_date := (v_result_date - INTERVAL '1 year')::DATE;
    END IF;
  END IF;

  RETURN v_result_date;
END;
$$;

-- Etapa 2: Modificar reset_monthly_usage() para respeitar billing cycle
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resetar contadores de clientes cujo billing period mudou
  UPDATE public.client_usage cu
  SET 
    quotes_this_month = 0,
    quote_responses_this_month = 0,
    last_reset_date = public.get_billing_period_start(cu.client_id, CURRENT_DATE),
    updated_at = now()
  WHERE cu.last_reset_date < public.get_billing_period_start(cu.client_id, CURRENT_DATE);
  
  RAISE LOG 'reset_monthly_usage: Resetados % registros', 
    (SELECT COUNT(*) FROM public.client_usage WHERE last_reset_date < public.get_billing_period_start(client_id, CURRENT_DATE));
END;
$$;

-- Etapa 3: Criar/atualizar trigger de auto-reset no BEFORE UPDATE
CREATE OR REPLACE FUNCTION public.auto_reset_usage_on_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_start DATE;
BEGIN
  -- Calcular início do billing period atual
  v_billing_start := public.get_billing_period_start(NEW.client_id, CURRENT_DATE);
  
  -- Se o last_reset_date é anterior ao billing period atual, resetar
  IF NEW.last_reset_date < v_billing_start THEN
    NEW.quotes_this_month := 0;
    NEW.quote_responses_this_month := 0;
    NEW.last_reset_date := v_billing_start;
    NEW.updated_at := now();
    
    RAISE LOG 'auto_reset_usage_on_read: Cliente % resetado para billing period %', 
      NEW.client_id, v_billing_start;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger antigo se existir
DROP TRIGGER IF EXISTS client_usage_auto_reset ON public.client_usage;

-- Criar novo trigger
CREATE TRIGGER client_usage_auto_reset
  BEFORE UPDATE ON public.client_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reset_usage_on_read();

-- Etapa 4: Atualizar get_or_create_client_usage() para inicializar com billing period
CREATE OR REPLACE FUNCTION public.get_or_create_client_usage(client_uuid UUID)
RETURNS client_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_record public.client_usage;
  v_billing_start DATE;
BEGIN
  -- Buscar registro existente
  SELECT * INTO usage_record
  FROM public.client_usage
  WHERE client_id = client_uuid;
  
  -- Se não existe, criar com billing period correto
  IF NOT FOUND THEN
    v_billing_start := public.get_billing_period_start(client_uuid, CURRENT_DATE);
    
    INSERT INTO public.client_usage (client_id, last_reset_date)
    VALUES (client_uuid, v_billing_start)
    RETURNING * INTO usage_record;
    
    RAISE LOG 'get_or_create_client_usage: Criado registro para cliente % com billing start %', 
      client_uuid, v_billing_start;
  ELSE
    -- Se existe, verificar se precisa resetar
    PERFORM public.reset_monthly_usage();
  END IF;
  
  RETURN usage_record;
END;
$$;

-- Etapa 5: Corrigir last_reset_date de todos os clientes existentes
UPDATE public.client_usage cu
SET 
  last_reset_date = public.get_billing_period_start(cu.client_id, CURRENT_DATE),
  updated_at = now()
WHERE last_reset_date != public.get_billing_period_start(cu.client_id, CURRENT_DATE);