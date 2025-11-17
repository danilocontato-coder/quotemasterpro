-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Habilitar realtime para a tabela payments
ALTER TABLE payments REPLICA IDENTITY FULL;

-- Criar o cron job para sincronização automática de pagamentos (a cada 5 minutos)
SELECT cron.schedule(
  'sync-asaas-payments-every-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/scheduled-sync-payments',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);

-- Verificar se o cron foi criado corretamente
SELECT * FROM cron.job WHERE jobname = 'sync-asaas-payments-every-5min';