-- ============================================================================
-- AUTOMAÇÃO CRON PARA LEMBRETES DE COBRANÇA
-- ============================================================================

-- Criar função wrapper para chamar edge function
CREATE OR REPLACE FUNCTION public.trigger_send_overdue_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text := 'https://bpsqyaxdhqejozmlejcb.supabase.co';
  service_key text;
BEGIN
  -- Buscar service key das configurações (se armazenada)
  -- Ou usar diretamente do Deno.env na edge function
  
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-overdue-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('action', 'check_overdue')
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Registrar erro mas não falhar
    RAISE WARNING 'Erro ao chamar send-overdue-reminders: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.trigger_send_overdue_reminders IS 'Função wrapper para chamar edge function de lembretes de cobrança via cron';

-- Agendar execução diária às 10h UTC (7h BRT)
SELECT cron.schedule(
  'send-overdue-reminders-daily',
  '0 10 * * *',
  $$SELECT public.trigger_send_overdue_reminders();$$
);