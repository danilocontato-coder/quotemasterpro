-- CONSOLIDAÇÃO COMPLETA DOS FORNECEDORES DE TESTE
-- Fornecedor Principal: f6d86bb9-d9d1-4276-beaa-5d58571435bd (Fornecedor XYZ)
-- Fornecedores Secundários: 821f0f4e-b960-4560-a1da-57716857cefc, a9e173f9-9f12-4152-845a-f45e99559f7a

-- FASE 1: Migrar Quote Responses
UPDATE quote_responses
SET supplier_id = 'f6d86bb9-d9d1-4276-beaa-5d58571435bd'
WHERE supplier_id IN (
  '821f0f4e-b960-4560-a1da-57716857cefc',
  'a9e173f9-9f12-4152-845a-f45e99559f7a'
);

-- FASE 2: Migrar Quotes
UPDATE quotes
SET 
  supplier_id = 'f6d86bb9-d9d1-4276-beaa-5d58571435bd',
  updated_at = NOW()
WHERE supplier_id IN (
  '821f0f4e-b960-4560-a1da-57716857cefc',
  'a9e173f9-9f12-4152-845a-f45e99559f7a'
);

-- FASE 3: Vincular Usuário ao Fornecedor Principal
UPDATE profiles
SET 
  supplier_id = 'f6d86bb9-d9d1-4276-beaa-5d58571435bd',
  updated_at = NOW()
WHERE email = 'danilo.contato@gmail.com';

-- FASE 4: Desativar Fornecedores Secundários
UPDATE suppliers
SET 
  status = 'inactive',
  name = name || ' (TESTE DESATIVADO)',
  updated_at = NOW()
WHERE id IN (
  '821f0f4e-b960-4560-a1da-57716857cefc',
  'a9e173f9-9f12-4152-845a-f45e99559f7a'
);

-- FASE 5: Log de Auditoria
INSERT INTO audit_logs (action, entity_type, entity_id, details)
VALUES 
  ('CONSOLIDATE_SUPPLIERS', 'suppliers', 'f6d86bb9-d9d1-4276-beaa-5d58571435bd', 
   '{"message": "Consolidados fornecedores de teste em fornecedor principal", "secondary_suppliers": ["821f0f4e-b960-4560-a1da-57716857cefc", "a9e173f9-9f12-4152-845a-f45e99559f7a"]}'::jsonb);