-- ============================================================================
-- FINAL DATABASE FUNCTION SECURITY HARDENING - Phase 3
-- Fix remaining functions missing SET search_path = public
-- ============================================================================

-- Fix: run_automatic_billing (calls edge function, needs secure path)
CREATE OR REPLACE FUNCTION public.run_automatic_billing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/automatic-billing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY"}'::jsonb,
    body := '{"action": "daily_billing"}'::jsonb
  );
END;
$function$;

-- Fix: check_overdue_accounts (calls edge function, needs secure path)
CREATE OR REPLACE FUNCTION public.check_overdue_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/automatic-billing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY"}'::jsonb,
    body := '{"action": "check_overdue"}'::jsonb
  );
END;
$function$;

-- Fix: initialize_client_data (important initialization function)
CREATE OR REPLACE FUNCTION public.initialize_client_data(client_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Criar registro de usage para o cliente
  INSERT INTO public.client_usage (client_id, quotes_this_month, users_count, storage_used_gb)
  VALUES (client_uuid, 0, 0, 0)
  ON CONFLICT (client_id) DO NOTHING;
  
  -- Criar centros de custo padrão
  PERFORM public.create_default_cost_centers(client_uuid);
  
  -- Log da inicialização
  INSERT INTO public.audit_logs (
    action,
    entity_type,
    entity_id,
    panel_type,
    details
  ) VALUES (
    'CLIENT_DATA_INITIALIZED',
    'clients',
    client_uuid::text,
    'system',
    jsonb_build_object(
      'message', 'Dados do cliente inicializados com sucesso',
      'timestamp', now()
    )
  );
END;
$function$;

-- Add final audit log for complete security hardening
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'SECURITY_HARDENING_COMPLETE',
  'system',
  'database-functions-2025',
  'system',
  jsonb_build_object(
    'phase', 'database_functions_final',
    'functions_secured', ARRAY[
      'run_automatic_billing',
      'check_overdue_accounts', 
      'initialize_client_data'
    ],
    'total_functions_hardened', 12,
    'audit_date', now(),
    'security_level', 'production_grade'
  )
);