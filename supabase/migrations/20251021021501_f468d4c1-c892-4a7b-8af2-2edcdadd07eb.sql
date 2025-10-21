-- Corrigir vinculação do usuário a@dcport.com.br ao cliente
-- 1. Criar/atualizar profile vinculado ao cliente 'debug'
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  client_id,
  tenant_type,
  active,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  '0280ec8f-3724-4ab1-9048-1e287a113bca',
  'a@dcport.com.br',
  'TESTE FINAL 2',
  'manager',
  '38db2d1f-4fab-407c-9e9f-c3b6533e7cfa', -- Cliente 'debug'
  'client',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  tenant_type = EXCLUDED.tenant_type,
  active = EXCLUDED.active,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at = NOW();

-- 2. Atualizar tabela users com o client_id
UPDATE users
SET 
  client_id = '38db2d1f-4fab-407c-9e9f-c3b6533e7cfa',
  updated_at = NOW()
WHERE auth_user_id = '0280ec8f-3724-4ab1-9048-1e287a113bca';