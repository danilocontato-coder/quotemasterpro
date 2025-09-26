-- CORREÇÃO E CONTINUAÇÃO DA AUDITORIA DE SEGURANÇA PARA FORNECEDORES
-- Corrigir erro anterior e completar implementação

-- 1. PRODUCTS - Adicionar supplier_id se não existe e políticas RLS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Remover políticas existentes de products
DROP POLICY IF EXISTS "products_supplier_select" ON public.products;
DROP POLICY IF EXISTS "products_supplier_insert" ON public.products;
DROP POLICY IF EXISTS "products_supplier_update" ON public.products;
DROP POLICY IF EXISTS "products_supplier_delete" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

-- Habilitar RLS em products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS seguras para products
CREATE POLICY "products_supplier_select" 
ON public.products 
FOR SELECT 
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin' OR
  get_user_role() IN ('client', 'manager', 'collaborator')
);

CREATE POLICY "products_supplier_insert" 
ON public.products 
FOR INSERT 
WITH CHECK (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "products_supplier_update" 
ON public.products 
FOR UPDATE 
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "products_supplier_delete" 
ON public.products 
FOR DELETE 
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

-- 2. QUOTE_RESPONSES - Verificar e corrigir políticas
ALTER TABLE public.quote_responses ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Remover políticas existentes
DROP POLICY IF EXISTS "quote_responses_supplier_select" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_supplier_insert" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_supplier_update" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_admin_all" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_client_select" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_select" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_insert" ON public.quote_responses;
DROP POLICY IF EXISTS "quote_responses_update" ON public.quote_responses;

-- Habilitar RLS
ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para quote_responses
CREATE POLICY "quote_responses_supplier_select" 
ON public.quote_responses 
FOR SELECT 
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin' OR
  (quote_id IN (SELECT id FROM quotes WHERE client_id = get_current_user_client_id()))
);

CREATE POLICY "quote_responses_supplier_insert" 
ON public.quote_responses 
FOR INSERT 
WITH CHECK (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_responses_supplier_update" 
ON public.quote_responses 
FOR UPDATE 
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

-- 3. SUPPLIER_RATINGS - Verificar políticas
DROP POLICY IF EXISTS "supplier_ratings_insert" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_select" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_admin" ON public.supplier_ratings;

-- Habilitar RLS
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas para supplier_ratings
CREATE POLICY "supplier_ratings_client_insert" 
ON public.supplier_ratings 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "supplier_ratings_view" 
ON public.supplier_ratings 
FOR SELECT 
USING (
  supplier_id = get_current_user_supplier_id() OR
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 4. USERS - Corrigir políticas para fornecedores
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supplier_id UUID;

DROP POLICY IF EXISTS "users_supplier_select" ON public.users;
DROP POLICY IF EXISTS "users_supplier_insert" ON public.users;
DROP POLICY IF EXISTS "users_supplier_update" ON public.users;
DROP POLICY IF EXISTS "users_supplier_delete" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_client_access" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "users_admin_all" 
ON public.users 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "users_supplier_access" 
ON public.users 
FOR ALL
USING (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
)
WITH CHECK (
  supplier_id = get_current_user_supplier_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "users_client_access" 
ON public.users 
FOR SELECT
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 5. TRIGGERS para auto-definir supplier_id

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