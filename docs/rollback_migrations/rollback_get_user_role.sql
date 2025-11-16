-- 🚨 ROLLBACK SCRIPT - Reverter get_user_role() para versão antiga
-- 
-- USO: Execute este script SE E SOMENTE SE a nova versão causar problemas
-- 
-- Como executar:
-- 1. Via Supabase Dashboard: SQL Editor > Colar e executar
-- 2. Via CLI: supabase db push < docs/rollback_migrations/rollback_get_user_role.sql

-- ====================================
-- ROLLBACK: get_user_role()
-- ====================================

-- Restaurar versão ANTIGA que consulta profiles.role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar se rollback funcionou
DO $$
DECLARE
  test_role TEXT;
BEGIN
  test_role := get_user_role();
  RAISE NOTICE '✅ Rollback executado com sucesso. Role atual: %', COALESCE(test_role, 'NULL');
END;
$$;

-- ====================================
-- REMOVER has_role_text() (se existir)
-- ====================================

DROP FUNCTION IF EXISTS has_role_text(text);

-- ====================================
-- LOG DE ROLLBACK
-- ====================================

-- Registrar rollback no audit log (se tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      action, 
      entity_type, 
      entity_id, 
      panel_type,
      details
    ) VALUES (
      'ROLLBACK_EXECUTED',
      'database_function',
      'get_user_role',
      'admin',
      jsonb_build_object(
        'timestamp', NOW(),
        'reason', 'Reverting to profiles.role implementation',
        'rollback_script', 'rollback_get_user_role.sql'
      )
    );
  END IF;
END;
$$;

-- ====================================
-- TESTES DE VALIDAÇÃO
-- ====================================

-- Teste 1: get_user_role() retorna valor
DO $$
DECLARE
  role_result TEXT;
BEGIN
  role_result := get_user_role();
  
  IF role_result IS NULL THEN
    RAISE WARNING '⚠️ get_user_role() retornou NULL. Verifique se profiles.role está preenchido.';
  ELSE
    RAISE NOTICE '✅ get_user_role() retornou: %', role_result;
  END IF;
END;
$$;

-- Teste 2: Verificar se profiles.role existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION '❌ ERRO CRÍTICO: profiles.role não existe! Rollback pode ter falhado.';
  ELSE
    RAISE NOTICE '✅ Column profiles.role existe';
  END IF;
END;
$$;

-- Teste 3: Contar usuários com role preenchido
DO $$
DECLARE
  users_with_role INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_with_role FROM profiles WHERE role IS NOT NULL;
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  RAISE NOTICE '✅ Usuários com role: % de %', users_with_role, total_users;
  
  IF users_with_role = 0 AND total_users > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: Nenhum usuário tem role preenchido em profiles!';
  END IF;
END;
$$;

-- ====================================
-- RESUMO
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔄 ROLLBACK CONCLUÍDO';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Função revertida: get_user_role()';
  RAISE NOTICE 'Fonte de role: profiles.role';
  RAISE NOTICE 'Data/Hora: %', NOW();
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Verificar logs de erro no Supabase Dashboard';
  RAISE NOTICE '2. Testar login no frontend';
  RAISE NOTICE '3. Verificar se queries de cotações funcionam';
  RAISE NOTICE '4. Reportar problema que causou rollback';
  RAISE NOTICE '==========================================';
END;
$$;
