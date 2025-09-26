-- COMPLETAR AUDITORIA DE FORNECEDORES COM TRIGGERS E CORREÇÕES DE SEGURANÇA

-- 1. TRIGGERS para auto-definir supplier_id

-- Trigger para products
CREATE OR REPLACE FUNCTION public.trg_products_set_supplier_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.supplier_id IS NULL THEN
    NEW.supplier_id := get_current_user_supplier_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_supplier_id ON public.products;
CREATE TRIGGER trg_products_set_supplier_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_products_set_supplier_id();

-- Trigger para quote_responses
CREATE OR REPLACE FUNCTION public.trg_quote_responses_set_supplier_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.supplier_id IS NULL THEN
    NEW.supplier_id := get_current_user_supplier_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_responses_set_supplier_id ON public.quote_responses;
CREATE TRIGGER trg_quote_responses_set_supplier_id
  BEFORE INSERT ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quote_responses_set_supplier_id();

-- Trigger para users (fornecedores)
CREATE OR REPLACE FUNCTION public.trg_users_set_supplier_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir supplier_id se usuário é fornecedor e não foi definido
  IF NEW.supplier_id IS NULL AND get_user_role() = 'supplier' THEN
    NEW.supplier_id := get_current_user_supplier_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_supplier_id ON public.users;
CREATE TRIGGER trg_users_set_supplier_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_users_set_supplier_id();

-- 2. CORRIGIR FUNÇÕES COM SEARCH_PATH MUTABLE (principais da migration)

-- Corrigir função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Corrigir função log_financial_change
CREATE OR REPLACE FUNCTION public.log_financial_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.financial_logs (
    entity_type,
    entity_id, 
    action,
    old_data,
    new_data,
    user_id,
    automated
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN TG_TABLE_NAME = 'subscriptions' THEN NEW.id::text
      WHEN TG_TABLE_NAME = 'invoices' THEN NEW.id
      ELSE NEW.id::text
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    auth.uid(),
    false
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Corrigir função update_user_last_access
CREATE OR REPLACE FUNCTION public.update_user_last_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Atualizar last_access apenas se o valor anterior era null ou muito antigo (mais de 1 minuto)
  IF OLD.last_access IS NULL OR (now() - OLD.last_access) > interval '1 minute' THEN
    NEW.last_access = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Corrigir função update_updated_at_financial
CREATE OR REPLACE FUNCTION public.update_updated_at_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Corrigir função update_system_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;