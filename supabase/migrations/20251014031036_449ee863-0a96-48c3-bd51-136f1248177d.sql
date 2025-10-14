-- Criar tabela email_logs para monitoramento de envios
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
  provider TEXT CHECK (provider IN ('resend', 'sendgrid', 'smtp')),
  message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  client_id UUID REFERENCES public.clients(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_client_id ON public.email_logs(client_id);

-- RLS Policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admin pode ver todos os logs
CREATE POLICY "email_logs_admin_all" ON public.email_logs
  FOR ALL
  USING (get_user_role() = 'admin');

-- Sistema pode inserir logs
CREATE POLICY "email_logs_system_insert" ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

-- Clientes podem ver seus próprios logs
CREATE POLICY "email_logs_client_view" ON public.email_logs
  FOR SELECT
  USING (
    client_id = get_current_user_client_id() 
    OR get_user_role() = 'admin'
  );

COMMENT ON TABLE public.email_logs IS 'Logs de envio de e-mails para monitoramento e auditoria';
COMMENT ON COLUMN public.email_logs.status IS 'Status do envio: sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN public.email_logs.provider IS 'Provedor usado: resend, sendgrid ou smtp';