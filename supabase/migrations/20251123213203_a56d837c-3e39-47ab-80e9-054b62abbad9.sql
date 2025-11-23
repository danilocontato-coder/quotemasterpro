-- Criar tabela para rastrear visualizações de cotações por fornecedores
-- CORREÇÃO: quote_id é TEXT (não UUID) pois quotes.id é TEXT
CREATE TABLE IF NOT EXISTS quote_supplier_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,
  UNIQUE(quote_id, supplier_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_quote_supplier_views_quote ON quote_supplier_views(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_supplier_views_supplier ON quote_supplier_views(supplier_id);

-- Comentários para documentação
COMMENT ON TABLE quote_supplier_views IS 'Rastreia quando fornecedores visualizam cotações pela primeira vez';
COMMENT ON COLUMN quote_supplier_views.first_viewed_at IS 'Primeira vez que o fornecedor abriu a cotação';
COMMENT ON COLUMN quote_supplier_views.last_viewed_at IS 'Última vez que o fornecedor visualizou a cotação';
COMMENT ON COLUMN quote_supplier_views.view_count IS 'Número total de visualizações';

-- RLS Policies
ALTER TABLE quote_supplier_views ENABLE ROW LEVEL SECURITY;

-- Fornecedores podem ver suas próprias visualizações
CREATE POLICY "Suppliers can view their own views"
  ON quote_supplier_views FOR SELECT
  USING (
    supplier_id IN (
      SELECT supplier_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Fornecedores podem inserir suas próprias visualizações
CREATE POLICY "Suppliers can insert their own views"
  ON quote_supplier_views FOR INSERT
  WITH CHECK (
    supplier_id IN (
      SELECT supplier_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Fornecedores podem atualizar suas próprias visualizações
CREATE POLICY "Suppliers can update their own views"
  ON quote_supplier_views FOR UPDATE
  USING (
    supplier_id IN (
      SELECT supplier_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins podem ver tudo
CREATE POLICY "Admins can view all views"
  ON quote_supplier_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );