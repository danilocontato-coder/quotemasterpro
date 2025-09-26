-- CRIAR TRIGGERS para auto-definir client_id automaticamente

-- 1. Trigger para QUOTE_ITEMS
CREATE OR REPLACE FUNCTION public.trg_quote_items_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id baseado na quote
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

-- 2. Trigger para AI_NEGOTIATIONS
CREATE OR REPLACE FUNCTION public.trg_ai_negotiations_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id baseado na quote
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

DROP TRIGGER IF EXISTS trg_ai_negotiations_set_client_id ON public.ai_negotiations;
CREATE TRIGGER trg_ai_negotiations_set_client_id
  BEFORE INSERT ON public.ai_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ai_negotiations_set_client_id();

-- 3. Trigger para QUOTE_TOKENS
CREATE OR REPLACE FUNCTION public.trg_quote_tokens_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id baseado na quote
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

DROP TRIGGER IF EXISTS trg_quote_tokens_set_client_id ON public.quote_tokens;
CREATE TRIGGER trg_quote_tokens_set_client_id
  BEFORE INSERT ON public.quote_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quote_tokens_set_client_id();

-- 4. Trigger para USER_SETTINGS
CREATE OR REPLACE FUNCTION public.trg_user_settings_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id baseado no user
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