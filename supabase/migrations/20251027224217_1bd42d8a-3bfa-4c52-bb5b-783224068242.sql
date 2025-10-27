-- ============================================
-- FASE 3: Atualizar Trigger handle_new_user
-- ============================================
-- Novos usuários criados pelo superadmin devem aceitar termos no primeiro login
-- (exceto superadmins que têm bypass automático)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_bypass boolean := false;
  user_role text;
BEGIN
  -- Determinar role do usuário
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'collaborator');
  
  -- Apenas role 'admin' bypassa termos automaticamente
  IF user_role = 'admin' THEN
    should_bypass := true;
  END IF;
  
  -- Inserir profile com termos NÃO aceitos (exceto superadmins)
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    role,
    tenant_type,
    active,
    onboarding_completed,
    terms_accepted,        -- ⚠️ NOVO: false para não-admins
    bypass_terms,          -- ⚠️ NOVO: true apenas para admins
    created_at
  ) VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'tenant_type', 'client'),
    true,
    false,                 -- onboarding ainda não completado
    should_bypass,         -- terms_accepted = true APENAS se admin
    should_bypass,         -- bypass_terms = true APENAS se admin
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    bypass_terms = EXCLUDED.bypass_terms,  -- Atualizar se mudou
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger que cria profile automaticamente quando usuário é criado no Auth.
- Superadmins (role=admin): bypass_terms=true, terms_accepted=true
- Outros usuários: terms_accepted=false (devem aceitar no primeiro login)
- Implementado em: 2025-10-28 (Fases 2+3 do plano de termos de uso)';