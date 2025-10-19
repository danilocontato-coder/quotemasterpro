-- ============================================================================
-- FASE 1: CORREÇÃO EMERGENCIAL - Cliente suporte@dcport.com.br (v3)
-- ============================================================================
-- Versão: 3 (corrigido UPSERT em tabela users sem unique constraint)
-- ============================================================================

DO $$
DECLARE
  v_auth_user_id uuid := 'db68e370-4752-4d9f-9de7-92c6d304a651';
  v_client_id uuid := '38db2d1f-4fab-407c-9e9f-c3b6533e7cfa';
  v_email text := 'suporte@dcport.com.br';
  v_client_name text := 'DCPort';
  v_step text;
  v_profile_exists_before boolean;
  v_role_exists_before boolean;
  v_user_exists_before boolean;
  v_profile_exists_after boolean;
  v_role_exists_after boolean;
  v_user_exists_after boolean;
  v_users_updated integer;
BEGIN
  RAISE NOTICE '=== FASE 1: CORREÇÃO EMERGENCIAL (v3) ===';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE 'Cliente: % (%)', v_client_name, v_client_id;
  RAISE NOTICE 'Usuário: % (%)', v_email, v_auth_user_id;
  RAISE NOTICE '';

  -- Verificar estado antes
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_auth_user_id) INTO v_profile_exists_before;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_auth_user_id AND role = 'admin_cliente') INTO v_role_exists_before;
  SELECT EXISTS(SELECT 1 FROM public.users WHERE auth_user_id = v_auth_user_id) INTO v_user_exists_before;

  RAISE NOTICE '📊 ANTES:';
  RAISE NOTICE '  Profile: % | Role: % | Users: %', v_profile_exists_before, v_role_exists_before, v_user_exists_before;
  RAISE NOTICE '';

  -- ========================================
  -- PASSO 1: Profile
  -- ========================================
  v_step := 'CREATE_PROFILE';
  RAISE NOTICE '🔧 Passo 1: Profile';
  
  INSERT INTO public.profiles (
    id, email, name, role, client_id, tenant_type,
    onboarding_completed, active, created_at, updated_at
  ) VALUES (
    v_auth_user_id, v_email, 'Suporte DCPort', 'manager', v_client_id, 'client',
    true, true, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    client_id = EXCLUDED.client_id,
    onboarding_completed = true,
    active = true,
    updated_at = now();

  RAISE NOTICE '  ✅ Profile OK';

  -- ========================================
  -- PASSO 2: Role
  -- ========================================
  v_step := 'ASSIGN_ROLE';
  RAISE NOTICE '🔧 Passo 2: Role admin_cliente';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_auth_user_id, 'admin_cliente')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE '  ✅ Role OK';

  -- ========================================
  -- PASSO 3: Users (UPSERT manual)
  -- ========================================
  v_step := 'UPDATE_USERS_TABLE';
  RAISE NOTICE '🔧 Passo 3: Tabela users';

  -- Primeiro tenta UPDATE
  UPDATE public.users
  SET
    client_id = v_client_id,
    name = 'Suporte DCPort',
    email = v_email,
    status = 'active',
    updated_at = now()
  WHERE auth_user_id = v_auth_user_id;

  GET DIAGNOSTICS v_users_updated = ROW_COUNT;

  -- Se não atualizou nada, faz INSERT
  IF v_users_updated = 0 THEN
    INSERT INTO public.users (
      auth_user_id, client_id, name, email, role, status, created_at, updated_at
    ) VALUES (
      v_auth_user_id, v_client_id, 'Suporte DCPort', v_email, 'manager', 'active', now(), now()
    );
    RAISE NOTICE '  ✅ Users criado';
  ELSE
    RAISE NOTICE '  ✅ Users atualizado';
  END IF;

  -- ========================================
  -- Verificar resultado
  -- ========================================
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_auth_user_id) INTO v_profile_exists_after;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_auth_user_id AND role = 'admin_cliente') INTO v_role_exists_after;
  SELECT EXISTS(SELECT 1 FROM public.users WHERE auth_user_id = v_auth_user_id) INTO v_user_exists_after;

  -- ========================================
  -- PASSO 4: Auditoria
  -- ========================================
  v_step := 'AUDIT_LOG';
  RAISE NOTICE '🔧 Passo 4: Auditoria';

  INSERT INTO public.audit_logs (
    user_id, action, entity_type, entity_id, panel_type, details, created_at
  ) VALUES (
    v_auth_user_id,
    'EMERGENCY_FIX_PHASE_1',
    'client_setup',
    v_client_id::text,
    'system',
    jsonb_build_object(
      'fix_type', 'missing_profile_and_role',
      'client_id', v_client_id,
      'client_name', v_client_name,
      'email', v_email,
      'steps', jsonb_build_array('profile', 'role', 'users_table'),
      'before', jsonb_build_object(
        'profile', v_profile_exists_before,
        'role', v_role_exists_before,
        'users', v_user_exists_before
      ),
      'after', jsonb_build_object(
        'profile', v_profile_exists_after,
        'role', v_role_exists_after,
        'users', v_user_exists_after
      ),
      'script', 'migration_v3',
      'timestamp', now()
    ),
    now()
  );

  RAISE NOTICE '  ✅ Auditoria OK';
  RAISE NOTICE '';

  -- ========================================
  -- Resultado Final
  -- ========================================
  RAISE NOTICE '📊 DEPOIS:';
  RAISE NOTICE '  Profile: % | Role: % | Users: %', v_profile_exists_after, v_role_exists_after, v_user_exists_after;
  RAISE NOTICE '';
  
  IF v_profile_exists_after AND v_role_exists_after AND v_user_exists_after THEN
    RAISE NOTICE '✅ FASE 1 CONCLUÍDA COM SUCESSO!';
  ELSE
    RAISE WARNING '⚠️  Nem tudo foi criado. Verificar.';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERRO: % (step: %)', SQLERRM, v_step;
    
    -- Log de erro sem user_id
    INSERT INTO public.audit_logs (
      user_id, action, entity_type, entity_id, panel_type, details, created_at
    ) VALUES (
      NULL,
      'EMERGENCY_FIX_PHASE_1_ERROR',
      'client_setup',
      v_client_id::text,
      'system',
      jsonb_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'failed_step', v_step,
        'attempted_user', v_auth_user_id
      ),
      now()
    );
    
    RAISE;
END $$;