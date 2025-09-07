-- Simular comunicados agrupados para testar
-- Inserir comunicados com mesmo announcement_group_id

-- Primeiro, vamos ver os announcement_group_id existentes
UPDATE announcements 
SET announcement_group_id = '123e4567-e89b-12d3-a456-426614174000'
WHERE title = 'teste comunicado';

-- Inserir um comunicado adicional com o mesmo group_id para simular agrupamento
INSERT INTO announcements (
  id,
  announcement_group_id,
  client_id,
  title,
  content,
  type,
  priority,
  target_audience,
  created_by,
  created_by_name,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '123e4567-e89b-12d3-a456-426614174000',
  (SELECT id FROM clients WHERE name = 'Empresa Teste' LIMIT 1),
  'teste comunicado',
  'Este é um comunicado de teste para verificar o agrupamento',
  'info',
  'medium',
  'clients',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  'Admin',
  now(),
  now()
);