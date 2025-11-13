-- Tornar quote_id opcional para permitir cartas independentes
ALTER TABLE invitation_letters 
  ALTER COLUMN quote_id DROP NOT NULL;

-- Adicionar novos campos para cartas independentes
ALTER TABLE invitation_letters 
  ADD COLUMN IF NOT EXISTS quote_category TEXT,
  ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS items_summary JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS direct_emails TEXT[] DEFAULT '{}';

-- Índice para performance em consultas por categoria
CREATE INDEX IF NOT EXISTS idx_invitation_letters_category 
  ON invitation_letters(quote_category);

-- Comentários para documentação
COMMENT ON COLUMN invitation_letters.quote_id IS 'Opcional: ID da cotação vinculada (se houver)';
COMMENT ON COLUMN invitation_letters.quote_category IS 'Categoria da carta quando independente (ex: Manutenção, Limpeza)';
COMMENT ON COLUMN invitation_letters.estimated_budget IS 'Orçamento estimado para cartas independentes';
COMMENT ON COLUMN invitation_letters.items_summary IS 'Resumo de itens para cartas independentes';
COMMENT ON COLUMN invitation_letters.direct_emails IS 'E-mails diretos para fornecedores não cadastrados';