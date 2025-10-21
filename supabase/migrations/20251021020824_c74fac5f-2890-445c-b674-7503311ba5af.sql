-- Correção: Adicionar constraint única e criar registro
-- 1. Adicionar constraint única se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_auth_user_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- 2. Inserir na tabela users
INSERT INTO users (
  id, 
  auth_user_id, 
  name, 
  email, 
  role, 
  status, 
  force_password_change, 
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0280ec8f-3724-4ab1-9048-1e287a113bca',
  'TESTE FINAL 2',
  'a@dcport.com.br',
  'manager',
  'active',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 3. Corrigir role em user_roles
UPDATE user_roles 
SET role = 'manager'
WHERE user_id = '0280ec8f-3724-4ab1-9048-1e287a113bca'
AND role = 'admin_cliente';

-- 4. Adicionar comentário de auditoria
COMMENT ON TABLE users IS 'Tabela corrigida em 2025 para incluir usuário a@dcport.com.br que estava órfão';