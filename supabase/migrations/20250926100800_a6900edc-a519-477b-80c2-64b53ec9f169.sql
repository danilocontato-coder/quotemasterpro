-- CORREÇÃO CRÍTICA - Etapa 4: Aplicar políticas RLS restritivas para isolamento total

-- 1. Aplicar constraint NOT NULL no supplier_id
ALTER TABLE public.products ALTER COLUMN supplier_id SET NOT NULL;

-- 2. Corrigir política de produtos - isolamento total por cliente
DROP POLICY IF EXISTS "products_supplier_select" ON public.products;

CREATE POLICY "products_supplier_select" 
ON public.products 
FOR SELECT 
USING (
  (supplier_id = get_current_user_supplier_id()) OR 
  (get_user_role() = 'admin'::text) OR
  -- Clientes podem ver apenas produtos de fornecedores do SEU cliente
  (
    get_user_role() IN ('client', 'manager', 'collaborator') AND
    supplier_id IN (
      SELECT s.id 
      FROM suppliers s 
      WHERE s.client_id = get_current_user_client_id()
    )
  )
);

-- 3. Corrigir política de fornecedores - isolamento total por cliente
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;

CREATE POLICY "suppliers_select" 
ON public.suppliers 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (id = get_current_user_supplier_id()) OR
  -- Clientes podem ver apenas fornecedores do SEU cliente
  (client_id = get_current_user_client_id())
);

-- 4. Criar trigger para garantir que produtos sempre tenham client_id correto baseado no fornecedor
CREATE OR REPLACE FUNCTION public.trg_products_set_client_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-definir client_id baseado no fornecedor
  IF NEW.client_id IS NULL OR NEW.client_id != (SELECT client_id FROM suppliers WHERE id = NEW.supplier_id) THEN
    NEW.client_id := (
      SELECT s.client_id 
      FROM public.suppliers s 
      WHERE s.id = NEW.supplier_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_products_set_client_id ON public.products;
CREATE TRIGGER trg_products_set_client_id
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_products_set_client_id();

-- 5. Garantir consistência dos dados existentes
UPDATE public.products 
SET client_id = s.client_id
FROM public.suppliers s
WHERE products.supplier_id = s.id 
  AND (products.client_id IS NULL OR products.client_id != s.client_id);