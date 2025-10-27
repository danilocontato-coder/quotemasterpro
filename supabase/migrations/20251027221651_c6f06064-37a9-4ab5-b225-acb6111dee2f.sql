-- =====================================================
-- CORREÇÃO: Desbloquear Superadmin da Plataforma
-- =====================================================

-- Etapa 1: Corrigir profile do superadmin atual
UPDATE profiles 
SET onboarding_completed = true,
    updated_at = now()
WHERE email = 'admin@quotemaster.com' 
  AND role = 'admin';

-- Etapa 2: Criar função para auto-completar onboarding de superadmins
CREATE OR REPLACE FUNCTION auto_complete_admin_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas para usuários com role 'admin' (superadmin da plataforma)
  -- que possuem bypass_terms = true
  IF NEW.role = 'admin' AND NEW.bypass_terms = true THEN
    NEW.onboarding_completed := true;
    RAISE NOTICE 'Onboarding auto-completed for superadmin: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Etapa 3: Criar trigger para prevenir o problema no futuro
DROP TRIGGER IF EXISTS ensure_admin_onboarding ON profiles;

CREATE TRIGGER ensure_admin_onboarding
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin' AND NEW.bypass_terms = true)
  EXECUTE FUNCTION auto_complete_admin_onboarding();

-- Comentários
COMMENT ON FUNCTION auto_complete_admin_onboarding() IS 
'Garante que superadmins da plataforma (role=admin + bypass_terms=true) sempre tenham onboarding_completed=true';

COMMENT ON TRIGGER ensure_admin_onboarding ON profiles IS 
'Auto-completa onboarding para superadmins ao criar/atualizar profiles';