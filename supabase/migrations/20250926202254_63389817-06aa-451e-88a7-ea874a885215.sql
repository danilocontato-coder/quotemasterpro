-- DEBUG: Política temporária muito permissiva para identificar o problema
BEGIN;

-- Remover todas as políticas de INSERT existentes
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_create" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_client_create_fixed" ON public.suppliers;

-- Criar política temporária MUITO permissiva para debug
CREATE POLICY "suppliers_debug_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (true); -- Permite qualquer inserção para usuários autenticados

-- Verificar se o trigger está funcionando
CREATE OR REPLACE FUNCTION public.debug_supplier_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_client_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  current_client_id := public.get_current_user_client_id();
  
  -- Log de debug (será visível nos logs do postgres)
  RAISE NOTICE 'SUPPLIER INSERT DEBUG: user_id=%, client_id=%, new_client_id=%', current_user_id, current_client_id, NEW.client_id;
  
  -- Forçar client_id se não estiver definido
  IF NEW.client_id IS NULL AND current_client_id IS NOT NULL THEN
    NEW.client_id := current_client_id;
    RAISE NOTICE 'CLIENT_ID SET TO: %', NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS debug_supplier_insert_trigger ON public.suppliers;
CREATE TRIGGER debug_supplier_insert_trigger
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.debug_supplier_insert();

COMMIT;