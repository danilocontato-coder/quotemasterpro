-- Adicionar flag de bypass de termos para administradores
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bypass_terms BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.bypass_terms IS 'Permite que administradores pulem a aceitação de termos de uso';

-- Atualizar admins existentes para ter bypass automático
UPDATE profiles 
SET bypass_terms = true 
WHERE role = 'admin';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_bypass_terms ON profiles(bypass_terms) WHERE bypass_terms = true;