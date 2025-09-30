-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar função que será chamada pelo cron para enviar lembretes
CREATE OR REPLACE FUNCTION public.send_automatic_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text := 'https://bpsqyaxdhqejozmlejcb.supabase.co';
  service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Chamar edge function via HTTP
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-quote-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'hours_since_sent', 48
    )
  );
END;
$$;

-- Agendar execução diária às 9h (UTC) - Todos os dias às 6h BRT
SELECT cron.schedule(
  'send-quote-reminders-daily',
  '0 9 * * *',
  $$SELECT public.send_automatic_reminders();$$
);

-- Log de auditoria
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'CRON_JOB_SCHEDULED',
  'system',
  'send-quote-reminders-daily',
  'system',
  jsonb_build_object(
    'message', 'Sistema de lembretes automáticos configurado',
    'schedule', 'Diariamente às 9h UTC (6h BRT)',
    'description', 'Envia lembretes para fornecedores que não responderam após 48h'
  )
);