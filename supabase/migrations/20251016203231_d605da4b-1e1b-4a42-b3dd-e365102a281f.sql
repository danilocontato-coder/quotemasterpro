-- Corrigir a função log_financial_change para garantir type matching
CREATE OR REPLACE FUNCTION public.log_financial_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
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
    -- Garantir que sempre seja text
    CASE 
      WHEN TG_TABLE_NAME = 'subscriptions' THEN NEW.id::text
      WHEN TG_TABLE_NAME = 'invoices' THEN NEW.id::text
      ELSE NEW.id::text
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    auth.uid(),
    false
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;