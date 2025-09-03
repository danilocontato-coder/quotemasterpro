-- Adicionar colunas state e city na tabela suppliers
ALTER TABLE public.suppliers 
ADD COLUMN state TEXT,
ADD COLUMN city TEXT;

-- Opcional: Remover a coluna region se não for mais necessária
-- ALTER TABLE public.suppliers DROP COLUMN region;

-- Comentário: As colunas state e city foram adicionadas para permitir seleção específica de localização
-- A coluna region foi mantida por compatibilidade, mas pode ser removida se necessário