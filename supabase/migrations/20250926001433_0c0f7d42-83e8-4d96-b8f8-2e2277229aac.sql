-- AUDITORIA COMPLETA DE SEGURANÇA PARA FORNECEDORES
-- Remover todas as políticas existentes primeiro e recriar de forma segura

-- 1. PRODUCTS - Limpar e recriar políticas
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Remover TODAS as políticas existentes de products
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.products';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Criar políticas seguras para products
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

-- 2. QUOTE_RESPONSES - Limpar e recriar
ALTER TABLE public.quote_responses ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Remover TODAS as políticas existentes de quote_responses
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'quote_responses' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.quote_responses';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para quote_responses
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

-- 3. SUPPLIER_RATINGS - Limpar e recriar
-- Remover TODAS as políticas existentes de supplier_ratings
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'supplier_ratings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.supplier_ratings';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas para supplier_ratings
CREATE POLICY "supplier_ratings_client_write" 
ON public.supplier_ratings 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "supplier_ratings_view_access" 
ON public.supplier_ratings 
FOR SELECT 
USING (
  supplier_id = get_current_user_supplier_id() OR
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 4. USERS - Limpar e recriar
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Remover TODAS as políticas existentes de users
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.users';
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "users_admin_full_access" 
ON public.users 
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "users_supplier_management" 
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

CREATE POLICY "users_client_view" 
ON public.users 
FOR SELECT
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);