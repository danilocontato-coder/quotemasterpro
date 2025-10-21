-- Criar tabela para registro de credenciais temporárias
CREATE TABLE IF NOT EXISTS temporary_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_user_id UUID,
  email TEXT NOT NULL,
  temporary_password_encrypted TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  sent_by_email BOOLEAN DEFAULT false,
  sent_by_whatsapp BOOLEAN DEFAULT false,
  sent_by_user_id UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'used', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_temp_credentials_user ON temporary_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_credentials_status ON temporary_credentials(status);
CREATE INDEX IF NOT EXISTS idx_temp_credentials_expires ON temporary_credentials(expires_at);

-- RLS: apenas admins podem ver
ALTER TABLE temporary_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar credenciais temporárias"
ON temporary_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Função para expirar credenciais antigas
CREATE OR REPLACE FUNCTION expire_old_credentials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE temporary_credentials
  SET status = 'expired'
  WHERE expires_at < now()
  AND status IN ('pending', 'sent');
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_temporary_credentials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_temporary_credentials_timestamp
BEFORE UPDATE ON temporary_credentials
FOR EACH ROW
EXECUTE FUNCTION update_temporary_credentials_updated_at();