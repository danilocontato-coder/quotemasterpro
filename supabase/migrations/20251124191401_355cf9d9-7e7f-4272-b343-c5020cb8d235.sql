
-- Corrigir vínculo do usuário danilo.contato@gmail.com com Fornecedor XYZ
UPDATE profiles
SET 
  supplier_id = '821f0f4e-b960-4560-a1da-57716857cefc',
  updated_at = NOW()
WHERE email = 'danilo.contato@gmail.com';
