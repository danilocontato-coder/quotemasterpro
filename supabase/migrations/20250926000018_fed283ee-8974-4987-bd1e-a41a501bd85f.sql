-- Adicionar coluna client_id à tabela categories para segregação por cliente
ALTER TABLE public.categories 
ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Atualizar registros existentes para associá-los aos clientes baseado no created_by
UPDATE public.categories 
SET client_id = (
  SELECT p.client_id 
  FROM public.profiles p 
  WHERE p.id = categories.created_by
)
WHERE created_by IS NOT NULL;

-- Remover políticas RLS antigas
DROP POLICY IF EXISTS categories_select_policy ON public.categories;
DROP POLICY IF EXISTS categories_insert_policy ON public.categories;
DROP POLICY IF EXISTS categories_update_policy ON public.categories;
DROP POLICY IF EXISTS categories_delete_policy ON public.categories;

-- Criar novas políticas RLS baseadas em client_id
CREATE POLICY "categories_select_secure" 
ON public.categories 
FOR SELECT 
USING (
  (is_system = true) OR 
  (client_id = get_current_user_client_id()) OR
  (get_user_role() = 'admin')
);

CREATE POLICY "categories_insert_secure" 
ON public.categories 
FOR INSERT 
WITH CHECK (
  (client_id = get_current_user_client_id()) AND
  (created_by = auth.uid()) AND
  (is_system = false)
);

CREATE POLICY "categories_update_secure" 
ON public.categories 
FOR UPDATE 
USING (
  (client_id = get_current_user_client_id()) AND
  (created_by = auth.uid()) AND
  (is_system = false)
);

CREATE POLICY "categories_delete_secure" 
ON public.categories 
FOR DELETE 
USING (
  (client_id = get_current_user_client_id()) AND
  (created_by = auth.uid()) AND
  (is_system = false)
);

-- Atualizar função para auto-inserir client_id
CREATE OR REPLACE FUNCTION public.trg_categories_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-definir client_id do usuário atual se não especificado
  IF NEW.client_id IS NULL AND NOT NEW.is_system THEN
    NEW.client_id := public.get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para auto-inserir client_id
DROP TRIGGER IF EXISTS trg_categories_set_client_id ON public.categories;
CREATE TRIGGER trg_categories_set_client_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_categories_set_client_id();