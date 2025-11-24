-- Criar tabela para rastrear visualizações de cotações pelos clientes
CREATE TABLE IF NOT EXISTS quote_client_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_responses_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quote_id, client_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_quote_client_views_quote ON quote_client_views(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_client_views_client ON quote_client_views(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_client_views_last_viewed ON quote_client_views(last_viewed_at DESC);

-- Habilitar RLS
ALTER TABLE quote_client_views ENABLE ROW LEVEL SECURITY;

-- Política para clientes visualizarem seus próprios registros
CREATE POLICY "Clients can view their own views"
  ON quote_client_views
  FOR SELECT
  USING (client_id = get_current_user_client_id());

-- Política para clientes inserirem/atualizarem seus registros
CREATE POLICY "Clients can upsert their own views"
  ON quote_client_views
  FOR ALL
  USING (client_id = get_current_user_client_id())
  WITH CHECK (client_id = get_current_user_client_id());

-- Política para admin ver tudo
CREATE POLICY "Admins can view all views"
  ON quote_client_views
  FOR SELECT
  USING (get_user_role() = 'admin');

-- Adicionar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE quote_client_views;