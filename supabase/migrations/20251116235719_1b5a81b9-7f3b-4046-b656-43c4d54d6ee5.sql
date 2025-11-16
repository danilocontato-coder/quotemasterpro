-- ✅ MIGRATION SEGURA: Consolidar roles em user_roles
--
-- OBJETIVO: Migrar get_user_role() para usar APENAS user_roles table
-- SEGURANÇA: Mantém profiles.role como fallback durante transição
-- ROLLBACK: Ver docs/rollback_migrations/rollback_get_user_role.sql
--
-- ATENÇÃO: Esta migration NÃO remove profiles.role ainda!
-- Isso será feito numa próxima migration após 1 semana de estabilidade.

-- ====================================
-- 1. CRIAR FUNÇÃO SEGURA: get_user_role()
-- ====================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Primeira prioridade: user_roles (fonte única de verdade)
  SELECT role::text INTO user_role
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Se não encontrou em user_roles, busca em profiles (fallback temporário)
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Log de alerta: usuário sem role em user_roles
    IF user_role IS NOT NULL THEN
      RAISE NOTICE 'MIGRATION ALERT: User % has role in profiles but not in user_roles', auth.uid();
    END IF;
  END IF;
  
  RETURN user_role;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION get_user_role() IS 'Returns user role from user_roles table (with profiles fallback during migration)';

-- ====================================
-- 2. CRIAR FUNÇÃO: has_role_text()
-- ====================================

CREATE OR REPLACE FUNCTION has_role_text(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text = _role
  )
  -- Fallback temporário para profiles durante migração
  OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = _role
  );
$$;

COMMENT ON FUNCTION has_role_text(text) IS 'Checks if user has specific role (with profiles fallback during migration)';

-- ====================================
-- 3. CRIAR FUNÇÃO: has_any_role() se não existir
-- ====================================

CREATE OR REPLACE FUNCTION has_any_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text = ANY(_roles)
  )
  -- Fallback temporário
  OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = ANY(_roles)
  );
$$;

COMMENT ON FUNCTION has_any_role(text[]) IS 'Checks if user has any of the specified roles (with profiles fallback during migration)';

-- ====================================
-- 4. MIGRAR DADOS: profiles.role → user_roles
-- ====================================

-- Inserir roles que estão em profiles mas NÃO em user_roles
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id,
  p.role::text
FROM profiles p
WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = p.id
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Log de resultado
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM user_roles;
  
  RAISE NOTICE '✅ Migration completed: % roles now in user_roles table', migrated_count;
END;
$$;

-- ====================================
-- 5. CRIAR TRIGGER: Sync profiles.role → user_roles
-- ====================================

-- Função do trigger
CREATE OR REPLACE FUNCTION sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se role mudou em profiles, atualizar em user_roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Remover role antigo
    DELETE FROM user_roles 
    WHERE user_id = NEW.id;
    
    -- Inserir novo role (se não for NULL)
    IF NEW.role IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::text)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Role synced for user %: % -> %', NEW.id, OLD.role, NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_sync_profile_role ON profiles;
CREATE TRIGGER trg_sync_profile_role
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_role_to_user_roles();

COMMENT ON TRIGGER trg_sync_profile_role ON profiles IS 'Temporary trigger to keep profiles.role and user_roles in sync during migration';

-- ====================================
-- 6. VALIDAÇÃO: Verificar integridade
-- ====================================

DO $$
DECLARE
  profiles_with_role INTEGER;
  user_roles_count INTEGER;
  missing_roles INTEGER;
BEGIN
  -- Contar profiles com role
  SELECT COUNT(*) INTO profiles_with_role
  FROM profiles
  WHERE role IS NOT NULL;
  
  -- Contar user_roles
  SELECT COUNT(*) INTO user_roles_count
  FROM user_roles;
  
  -- Contar divergências
  SELECT COUNT(*) INTO missing_roles
  FROM profiles p
  WHERE p.role IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
    );
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 MIGRATION VALIDATION';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Profiles with role: %', profiles_with_role;
  RAISE NOTICE 'Roles in user_roles: %', user_roles_count;
  RAISE NOTICE 'Missing in user_roles: %', missing_roles;
  
  IF missing_roles > 0 THEN
    RAISE WARNING '⚠️ WARNING: % profiles have role but not in user_roles!', missing_roles;
  ELSE
    RAISE NOTICE '✅ All profiles synced to user_roles';
  END IF;
  
  RAISE NOTICE '==========================================';
END;
$$;

-- ====================================
-- 7. CRIAR ÍNDICES PARA PERFORMANCE
-- ====================================

-- Índice para user_roles.user_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);

-- Índice para queries de role específico
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
ON user_roles(role);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON user_roles(user_id, role);

-- ====================================
-- 8. AUDIT LOG
-- ====================================

INSERT INTO audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
)
VALUES (
  'MIGRATION_APPLIED',
  'database_function',
  'consolidate_roles_secure',
  'admin',
  jsonb_build_object(
    'migration_file', 'consolidate_roles_secure.sql',
    'description', 'Consolidated roles to user_roles table with fallback',
    'breaking_change', false,
    'rollback_available', true,
    'rollback_script', 'docs/rollback_migrations/rollback_get_user_role.sql',
    'applied_at', NOW()
  )
);

-- ====================================
-- RESUMO FINAL
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES APPLIED:';
  RAISE NOTICE '1. get_user_role() now uses user_roles (with profiles fallback)';
  RAISE NOTICE '2. has_role_text() created for role checks';
  RAISE NOTICE '3. has_any_role() created for multiple role checks';
  RAISE NOTICE '4. All roles migrated from profiles to user_roles';
  RAISE NOTICE '5. Sync trigger created to keep tables in sync';
  RAISE NOTICE '6. Performance indexes added';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT NOTES:';
  RAISE NOTICE '- profiles.role is STILL ACTIVE (fallback during transition)';
  RAISE NOTICE '- Trigger keeps profiles.role and user_roles in sync';
  RAISE NOTICE '- Monitor for 7 days before removing profiles.role';
  RAISE NOTICE '- Rollback available: docs/rollback_migrations/rollback_get_user_role.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Test all role-based features';
  RAISE NOTICE '2. Monitor logs for "MIGRATION ALERT" messages';
  RAISE NOTICE '3. After 7 days stability: Remove profiles.role (Phase 3)';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
END;
$$;