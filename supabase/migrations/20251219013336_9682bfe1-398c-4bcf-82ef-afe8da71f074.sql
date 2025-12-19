-- Tabela para armazenar códigos de verificação de email
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON public.email_verifications(code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON public.email_verifications(expires_at);

-- Limpar códigos expirados automaticamente (após 24h)
CREATE INDEX IF NOT EXISTS idx_email_verifications_cleanup ON public.email_verifications(created_at) WHERE verified_at IS NULL;

-- RLS - Apenas service role pode acessar (edge functions)
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Política para edge functions usarem service_role
CREATE POLICY "Service role full access" ON public.email_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.email_verifications IS 'Armazena códigos de verificação de email para auto-cadastro de fornecedores';
COMMENT ON COLUMN public.email_verifications.code IS 'Código de 6 dígitos numérico';
COMMENT ON COLUMN public.email_verifications.attempts IS 'Número de tentativas de verificação (máx 5)';
COMMENT ON COLUMN public.email_verifications.expires_at IS 'Expira em 15 minutos após criação';