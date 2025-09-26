BEGIN;
-- Remover política e trigger de debug, e aplicar correção definitiva
DROP POLICY IF EXISTS "suppliers_debug_insert" ON public.suppliers;
DROP TRIGGER IF EXISTS debug_supplier_insert_trigger ON public.suppliers;
DROP FUNCTION IF EXISTS public.debug_supplier_insert();

-- Recriar a política correta de INSERT (sem depender de NEW.client_id)
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
CREATE POLICY "suppliers_client_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_user_client_id() IS NOT NULL
);

-- Garantir trigger BEFORE INSERT que seta o client_id
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := public.get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_suppliers_set_client_id ON public.suppliers;
CREATE TRIGGER before_suppliers_set_client_id
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_set_client_id();

-- Garantir trigger AFTER INSERT para criar associação em client_suppliers
CREATE OR REPLACE FUNCTION public.trg_link_client_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    INSERT INTO public.client_suppliers (client_id, supplier_id, status)
    VALUES (NEW.client_id, NEW.id, 'active')
    ON CONFLICT (client_id, supplier_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_suppliers_link_client ON public.suppliers;
CREATE TRIGGER after_suppliers_link_client
AFTER INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_link_client_supplier();

COMMIT;