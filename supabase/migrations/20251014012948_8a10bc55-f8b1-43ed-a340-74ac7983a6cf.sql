-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para atualizar taxas de câmbio diariamente às 9h Brasília (12h UTC)
SELECT cron.schedule(
  'update-exchange-rates-daily',
  '0 12 * * *', -- Todos os dias às 12h UTC (9h Brasília)
  $$
  SELECT
    net.http_post(
      url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/update-exchange-rates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY'
      ),
      body := jsonb_build_object('scheduled', true)
    ) as request_id;
  $$
);

-- Log de auditoria
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  NULL,
  'CRON_JOB_CREATED',
  'exchange_rates',
  'update-exchange-rates-daily',
  'system',
  jsonb_build_object(
    'schedule', '0 12 * * *',
    'description', 'Atualização diária de taxas USD/BRL às 9h Brasília via AwesomeAPI',
    'source', 'economia.awesomeapi.com.br',
    'url', 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
  )
);