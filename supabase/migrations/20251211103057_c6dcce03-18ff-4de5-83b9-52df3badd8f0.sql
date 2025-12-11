-- Corrigir perfis de fornecedores que têm client_id preenchido incorretamente
UPDATE profiles 
SET client_id = NULL 
WHERE role = 'supplier' 
  AND supplier_id IS NOT NULL 
  AND client_id IS NOT NULL;

-- Corrigir perfis de clientes que têm supplier_id preenchido incorretamente  
UPDATE profiles 
SET supplier_id = NULL 
WHERE role IN ('manager', 'collaborator') 
  AND client_id IS NOT NULL 
  AND supplier_id IS NOT NULL;