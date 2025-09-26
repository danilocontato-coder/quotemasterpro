-- CORRIGIR POLÍTICAS RLS - Remover todas as existentes primeiro

-- Remover todas as políticas existentes de quote_items
DROP POLICY IF EXISTS quote_items_insert ON public.quote_items;
DROP POLICY IF EXISTS quote_items_select ON public.quote_items;
DROP POLICY IF EXISTS quote_items_secure_insert ON public.quote_items;
DROP POLICY IF EXISTS quote_items_secure_select ON public.quote_items;
DROP POLICY IF EXISTS quote_items_secure_update ON public.quote_items;
DROP POLICY IF EXISTS quote_items_secure_delete ON public.quote_items;

-- Remover políticas de ai_negotiations
DROP POLICY IF EXISTS ai_negotiations_insert ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_select ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_update ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_secure_insert ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_secure_select ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_secure_update ON public.ai_negotiations;

-- Remover políticas de quote_tokens
DROP POLICY IF EXISTS quote_tokens_admin ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_insert_by_client ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_select_by_quote ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_secure_select ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_secure_insert ON public.quote_tokens;

-- Remover políticas de user_settings
DROP POLICY IF EXISTS user_settings_secure_select ON public.user_settings;
DROP POLICY IF EXISTS user_settings_secure_insert ON public.user_settings;
DROP POLICY IF EXISTS user_settings_secure_update ON public.user_settings;

-- Criar triggers para auto-definir client_id
CREATE OR REPLACE FUNCTION public.trg_quote_items_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT q.client_id 
      FROM public.quotes q 
      WHERE q.id = NEW.quote_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_items_set_client_id ON public.quote_items;
CREATE TRIGGER trg_quote_items_set_client_id
  BEFORE INSERT ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quote_items_set_client_id();

CREATE OR REPLACE FUNCTION public.trg_user_settings_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT p.client_id 
      FROM public.profiles p 
      WHERE p.id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_settings_set_client_id ON public.user_settings;
CREATE TRIGGER trg_user_settings_set_client_id
  BEFORE INSERT ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_user_settings_set_client_id();