-- Remover TODOS os triggers de log financeiro da tabela payments
-- Isso evita erros de conversão JSON com campos de texto

-- 1. Remover trigger de log_payment_changes se existir
DROP TRIGGER IF EXISTS log_payment_changes ON public.payments;

-- 2. Garantir que não há NENHUM trigger de financial_logs na tabela payments
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'payments' 
    AND tgname LIKE '%log%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.payments', trigger_rec.tgname);
  END LOOP;
END $$;

-- 3. Melhorar a função log_financial_change para ser mais robusta
-- Usar to_jsonb em vez de row_to_json e adicionar tratamento de erro
CREATE OR REPLACE FUNCTION public.log_financial_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Converter dados de forma segura, tratando exceções
  BEGIN
    v_old_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
    v_new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar conversão, registrar erro mas continuar
    v_old_data := jsonb_build_object('error', 'Failed to convert OLD data');
    v_new_data := jsonb_build_object('error', 'Failed to convert NEW data');
  END;

  INSERT INTO public.financial_logs (
    entity_type,
    entity_id, 
    action,
    old_data,
    new_data,
    user_id,
    automated
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    v_old_data,
    v_new_data,
    auth.uid(),
    false
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Se qualquer erro acontecer no log, não falhar a operação principal
  RAISE WARNING 'Failed to log financial change: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. Comentar para documentação
COMMENT ON TABLE public.payments IS 'Pagamentos - logs financeiros desabilitados para evitar erros de conversão JSON. Auditoria via approve_offline_payment e audit_logs.';
COMMENT ON FUNCTION public.log_financial_change() IS 'Função de log com tratamento robusto de erros de conversão JSON';
