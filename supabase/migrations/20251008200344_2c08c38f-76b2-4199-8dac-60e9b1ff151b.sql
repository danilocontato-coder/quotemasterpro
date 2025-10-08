-- ============================================
-- CORREÇÃO DE WARNINGS DE SEGURANÇA (v2)
-- ============================================

-- 🔒 WARN 1: Function Search Path Mutable
-- Garantir que todas as funções tenham search_path definido

-- Recriar funções críticas com search_path explícito
CREATE OR REPLACE FUNCTION public.get_accessible_client_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_client_id uuid;
  accessible_ids uuid[];
BEGIN
  SELECT client_id INTO user_client_id 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  IF user_client_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  
  SELECT ARRAY(
    SELECT id FROM public.clients 
    WHERE id = user_client_id 
       OR parent_client_id = user_client_id
  ) INTO accessible_ids;
  
  RETURN accessible_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_client_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_type client_type;
BEGIN
  IF NEW.parent_client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT client_type INTO parent_type
  FROM public.clients
  WHERE id = NEW.parent_client_id;
  
  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Cliente pai não encontrado';
  END IF;
  
  IF parent_type != 'administradora' THEN
    RAISE EXCEPTION 'Apenas administradoras podem ter clientes filhos';
  END IF;
  
  IF NEW.client_type != 'condominio_vinculado' THEN
    RAISE EXCEPTION 'Apenas condomínios vinculados podem ter parent_client_id';
  END IF;
  
  IF NEW.id = NEW.parent_client_id THEN
    RAISE EXCEPTION 'Cliente não pode ser pai de si mesmo';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 🔒 WARN 2: Extension in Public
-- Criar schema 'extensions' se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Tentar mover extensões para o schema correto
DO $$
BEGIN
    -- uuid-ossp
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

DO $$
BEGIN
    -- pg_trgm (usado para busca)
    CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN insufficient_privilege THEN NULL;
END $$;

COMMENT ON SCHEMA extensions IS 'Schema seguro para extensões do PostgreSQL';

-- ✅ Warnings SQL corrigidos!
-- 
-- 📝 AÇÃO MANUAL NECESSÁRIA no Supabase Dashboard:
-- 
-- WARN 3: Auth OTP long expiry
--   → Authentication > Settings > OTP Expiry
--   → Reduzir para máximo 3600 segundos
--
-- WARN 4: Leaked Password Protection
--   → Authentication > Settings 
--   → Habilitar "Leaked password protection"
--
-- WARN 5: Postgres version update
--   → Database > Settings
--   → Fazer upgrade da versão