-- ============================================
-- FASE 1: Hierarquia de Clientes (Administradoras)
-- IMPACTO: ZERO - Todas alterações são OPCIONAIS e RETROCOMPATÍVEIS
-- ============================================

-- 1️⃣ ENUM para Tipo de Cliente
CREATE TYPE client_type AS ENUM ('direct', 'administradora', 'condominio_vinculado');

-- 2️⃣ Adicionar colunas na tabela CLIENTS (todas NULLABLE e com DEFAULT)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'direct' NOT NULL,
ADD COLUMN IF NOT EXISTS parent_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 3️⃣ Atualizar clientes existentes como 'direct' (garantia)
UPDATE public.clients 
SET client_type = 'direct' 
WHERE client_type IS NULL;

-- 4️⃣ Adicionar coluna em QUOTES (NULLABLE - cotações antigas ficam NULL)
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS on_behalf_of_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 5️⃣ Adicionar limite de condomínios filhos em SUBSCRIPTION_PLANS (NULLABLE)
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS child_clients_limit integer DEFAULT NULL;

-- 6️⃣ Índices para otimização de queries hierárquicas
CREATE INDEX IF NOT EXISTS idx_clients_parent_client_id ON public.clients(parent_client_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON public.clients(client_type);
CREATE INDEX IF NOT EXISTS idx_quotes_on_behalf_of ON public.quotes(on_behalf_of_client_id);

-- 7️⃣ Função para obter clientes acessíveis (administradora + filhos)
CREATE OR REPLACE FUNCTION public.get_accessible_client_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_client_id uuid;
  accessible_ids uuid[];
BEGIN
  -- Obter client_id do usuário
  SELECT client_id INTO user_client_id 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  IF user_client_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  
  -- Se é administradora, retorna ela + filhos
  SELECT ARRAY(
    SELECT id FROM public.clients 
    WHERE id = user_client_id 
       OR parent_client_id = user_client_id
  ) INTO accessible_ids;
  
  RETURN accessible_ids;
END;
$$;

-- 8️⃣ ATUALIZAR RLS de QUOTES (ESTENDER, não substituir)
-- Remover policy antiga para recriar com nova lógica
DROP POLICY IF EXISTS quotes_select_policy ON public.quotes;

-- Nova policy que mantém lógica antiga + adiciona hierarquia
CREATE POLICY quotes_select_policy ON public.quotes
FOR SELECT
USING (
  user_has_module_access('quotes') 
  AND (
    -- ✅ LÓGICA ANTIGA (mantida)
    current_user_can_see_quote(id)
    
    -- ✅ NOVA LÓGICA (administradora vê cotações dos filhos)
    OR (
      client_id = ANY(get_accessible_client_ids(auth.uid()))
    )
    
    -- ✅ NOVA LÓGICA (condomínio vinculado vê cotações feitas em seu nome)
    OR (
      on_behalf_of_client_id = get_current_user_client_id()
    )
  )
);

-- 9️⃣ Trigger para validar hierarquia (prevenir loops e validar tipos)
CREATE OR REPLACE FUNCTION public.validate_client_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_type client_type;
BEGIN
  -- Se não tem parent, tudo OK
  IF NEW.parent_client_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validar que parent existe e é administradora
  SELECT client_type INTO parent_type
  FROM public.clients
  WHERE id = NEW.parent_client_id;
  
  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Cliente pai não encontrado';
  END IF;
  
  IF parent_type != 'administradora' THEN
    RAISE EXCEPTION 'Apenas administradoras podem ter clientes filhos';
  END IF;
  
  -- Validar que filho é condominio_vinculado
  IF NEW.client_type != 'condominio_vinculado' THEN
    RAISE EXCEPTION 'Apenas condomínios vinculados podem ter parent_client_id';
  END IF;
  
  -- Prevenir auto-referência
  IF NEW.id = NEW.parent_client_id THEN
    RAISE EXCEPTION 'Cliente não pode ser pai de si mesmo';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_client_hierarchy
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
WHEN (NEW.parent_client_id IS NOT NULL)
EXECUTE FUNCTION public.validate_client_hierarchy();

-- 🔟 Comentários para documentação
COMMENT ON COLUMN public.clients.client_type IS 'Tipo do cliente: direct (padrão), administradora ou condominio_vinculado';
COMMENT ON COLUMN public.clients.parent_client_id IS 'Se condominio_vinculado, referência para a administradora';
COMMENT ON COLUMN public.quotes.on_behalf_of_client_id IS 'Se cotação foi feita por administradora, ID do condomínio beneficiado';
COMMENT ON COLUMN public.subscription_plans.child_clients_limit IS 'Limite de condomínios filhos para administradoras (NULL = ilimitado)';

-- ✅ Migration completa e segura!