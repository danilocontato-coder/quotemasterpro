-- Adicionar coluna supplier_id à tabela quote_tokens
ALTER TABLE public.quote_tokens 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_quote_tokens_supplier_id ON public.quote_tokens(supplier_id);

-- Comentário para documentação
COMMENT ON COLUMN public.quote_tokens.supplier_id IS 
'ID do fornecedor específico para quem este token foi gerado. NULL = link genérico para qualquer fornecedor.';