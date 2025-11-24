-- Adicionar campo freight_cost (custo de frete) na tabela quotes
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS freight_cost NUMERIC DEFAULT 0;

-- Adicionar comentário para documentação
COMMENT ON COLUMN quotes.freight_cost IS 'Custo de frete/entrega da cotação em reais';