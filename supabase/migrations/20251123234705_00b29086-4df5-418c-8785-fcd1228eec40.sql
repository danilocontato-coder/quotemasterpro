-- Criar tabela de logs de envio de cotações para monitoramento
-- CORREÇÃO: quotes.id é TEXT, não UUID
CREATE TABLE IF NOT EXISTS quote_sending_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  endpoint_used TEXT,
  error_message TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_quote_sending_logs_quote ON quote_sending_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_sending_logs_status ON quote_sending_logs(status);
CREATE INDEX IF NOT EXISTS idx_quote_sending_logs_supplier ON quote_sending_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_sending_logs_created ON quote_sending_logs(created_at);

-- RLS policies
ALTER TABLE quote_sending_logs ENABLE ROW LEVEL SECURITY;

-- Admin pode ver todos os logs
CREATE POLICY "Admin can view all sending logs"
  ON quote_sending_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Clientes podem ver logs de suas cotações
CREATE POLICY "Clients can view their quote sending logs"
  ON quote_sending_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      INNER JOIN profiles ON profiles.client_id = quotes.client_id
      WHERE quotes.id = quote_sending_logs.quote_id
      AND profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'collaborator')
    )
  );

-- Fornecedores podem ver seus próprios logs
CREATE POLICY "Suppliers can view their sending logs"
  ON quote_sending_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.supplier_id = quote_sending_logs.supplier_id
      AND profiles.id = auth.uid()
      AND profiles.role = 'supplier'
    )
  );

COMMENT ON TABLE quote_sending_logs IS 'Logs de envio de cotações para fornecedores via WhatsApp e E-mail';
COMMENT ON COLUMN quote_sending_logs.channel IS 'Canal de envio: whatsapp ou email';
COMMENT ON COLUMN quote_sending_logs.status IS 'Status do envio: success ou failed';
COMMENT ON COLUMN quote_sending_logs.endpoint_used IS 'Endpoint da API usado para o envio (WhatsApp)';
COMMENT ON COLUMN quote_sending_logs.error_message IS 'Mensagem de erro se o envio falhou';
COMMENT ON COLUMN quote_sending_logs.response_data IS 'Resposta completa da API para debugging';