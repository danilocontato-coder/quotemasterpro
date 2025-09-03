-- Remover fornecedores de teste que têm client_id NULL
-- Estes são dados de exemplo que não pertencem a nenhum cliente específico
DELETE FROM suppliers 
WHERE client_id IS NULL 
AND (
  name ILIKE '%alpha%' OR 
  name ILIKE '%beta%' OR 
  name ILIKE '%gamma%' OR 
  cnpj ILIKE '%22.333%' OR 
  cnpj ILIKE '%33.444%' OR 
  cnpj ILIKE '%44.555%'
);

-- Verificar se há outros fornecedores de teste
DELETE FROM suppliers 
WHERE client_id IS NULL 
AND (
  name ILIKE '%teste%' OR 
  name ILIKE '%example%' OR 
  name ILIKE '%demo%' OR
  email ILIKE '%teste%' OR
  email ILIKE '%example%' OR
  email ILIKE '%demo%'
);