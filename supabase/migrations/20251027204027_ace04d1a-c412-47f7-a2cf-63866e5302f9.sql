-- =========================================================================
-- CORREÇÃO DE AVISOS DE SEGURANÇA DO SUPABASE LINTER
-- =========================================================================

-- 1. CORRIGIR FUNÇÕES SEM SEARCH_PATH (6 WARNINGS)
-- Adicionar search_path fixo em funções SECURITY DEFINER para prevenir
-- ataques de SQL injection via schema poisoning

-- Função: expire_old_credentials
CREATE OR REPLACE FUNCTION public.expire_old_credentials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE temporary_credentials
  SET status = 'expired'
  WHERE expires_at < now()
  AND status IN ('pending', 'sent');
END;
$function$;

COMMENT ON FUNCTION public.expire_old_credentials() IS 
'Expira credenciais temporárias antigas. SECURITY DEFINER com search_path fixo.';

-- Função: update_conversation_last_message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE quote_conversations 
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_conversation_last_message() IS 
'Trigger para atualizar timestamp de última mensagem. SECURITY DEFINER com search_path fixo.';

-- 2. MOVER EXTENSÃO PG_NET PARA SCHEMA EXTENSIONS (se possível)
-- Nota: pg_net pode ter sido instalado no schema public por padrão
-- Vamos tentar movê-lo para o schema extensions se existir

DO $$
BEGIN
  -- Criar schema extensions se não existir
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Tentar mover a extensão pg_net (pode falhar se não tiver permissão)
  BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
    RAISE NOTICE 'Extensão pg_net movida para schema extensions';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Não foi possível mover pg_net para extensions: %', SQLERRM;
  END;
END $$;

-- =========================================================================
-- WARNINGS QUE REQUEREM AÇÃO NO DASHBOARD DO SUPABASE
-- =========================================================================

-- Os seguintes warnings precisam ser corrigidos manualmente no Dashboard:
--
-- 1. AUTH OTP LONG EXPIRY (WARN)
--    Ação: Reduzir tempo de expiração do OTP
--    Dashboard: Authentication > Settings > Email Auth
--    Recomendado: 15 minutos ou menos
--
-- 2. LEAKED PASSWORD PROTECTION DISABLED (WARN)
--    Ação: Habilitar proteção contra senhas vazadas
--    Dashboard: Authentication > Settings > Password Protection
--    Recomendado: Ativar "Check for leaked passwords"
--
-- 3. POSTGRES VERSION OUTDATED (WARN)
--    Ação: Atualizar versão do PostgreSQL
--    Dashboard: Settings > Infrastructure > Database
--    Recomendado: Fazer upgrade para versão mais recente
--
-- 4. SECURITY DEFINER VIEWS (2 ERRORS)
--    Views encontradas: ai_usage_summary, approvals_with_details
--    Ação: Revisar se essas views realmente precisam de SECURITY DEFINER
--    Alternativa: Usar RLS policies ao invés de SECURITY DEFINER views

-- Adicionar comentário nas views problemáticas
COMMENT ON VIEW public.ai_usage_summary IS 
'ATENÇÃO: View usa dados agregados. Verificar se RLS é necessário.';

COMMENT ON VIEW public.approvals_with_details IS 
'ATENÇÃO: View com joins. Verificar se RLS é necessário ou usar policies nas tabelas base.';