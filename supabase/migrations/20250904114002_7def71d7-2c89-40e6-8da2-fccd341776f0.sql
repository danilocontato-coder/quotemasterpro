-- Adicionar campo supplier_scope à tabela quotes para armazenar a preferência do cliente
ALTER TABLE public.quotes 
ADD COLUMN supplier_scope text DEFAULT 'local' CHECK (supplier_scope IN ('local', 'all'));

-- Comentário da coluna
COMMENT ON COLUMN public.quotes.supplier_scope IS 'Escopo de fornecedores selecionado pelo cliente: local = apenas fornecedores cadastrados pelo cliente, all = locais + certificados';