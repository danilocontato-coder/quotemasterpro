-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função para executar cobrança automática
CREATE OR REPLACE FUNCTION public.run_automatic_billing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Chamar edge function para cobrança automática
  PERFORM net.http_post(
    url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/automatic-billing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY"}'::jsonb,
    body := '{"action": "daily_billing"}'::jsonb
  );
END;
$$;

-- Agendar execução diária da cobrança automática (todo dia às 09:00)
SELECT cron.schedule(
  'automatic-billing-daily',
  '0 9 * * *',
  'SELECT public.run_automatic_billing();'
);

-- Criar função para verificar inadimplência
CREATE OR REPLACE FUNCTION public.check_overdue_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Chamar edge function para verificar contas em atraso
  PERFORM net.http_post(
    url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/automatic-billing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY"}'::jsonb,
    body := '{"action": "check_overdue"}'::jsonb
  );
END;
$$;

-- Agendar verificação de inadimplência (todo dia às 10:00)
SELECT cron.schedule(
  'check-overdue-daily', 
  '0 10 * * *',
  'SELECT public.check_overdue_accounts();'
);

-- Adicionar configurações de boleto nas configurações financeiras
UPDATE public.financial_settings 
SET boleto_config = jsonb_build_object(
  'provider', 'pagseguro',
  'api_url', 'https://ws.sandbox.pagseguro.uol.com.br',
  'email', '',
  'token', '',
  'discount_days', 3,
  'interest_rate', 1.0,
  'fine_rate', 2.0,
  'instructions', 'Pagamento via boleto bancário. Após o vencimento haverá cobrança de multa e juros.',
  'expire_days', 30
);

-- Log das configurações de cron
INSERT INTO public.financial_logs (
  entity_type,
  entity_id, 
  action,
  new_data,
  automated
) VALUES (
  'system',
  'cron_setup',
  'configured',
  '{"message": "Cron jobs configurados para cobrança automática e verificação de inadimplência"}'::jsonb,
  true
);