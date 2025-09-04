-- Adicionar campos para armazenar seleção de fornecedores na cotação
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS selected_supplier_ids UUID[] DEFAULT '{}';

-- Atualizar cotações existentes para ter o array vazio por padrão
UPDATE quotes SET selected_supplier_ids = '{}' WHERE selected_supplier_ids IS NULL;