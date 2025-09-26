-- Criar trigger para auto-preencher client_id na tabela suppliers
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-definir client_id se não especificado
  IF NEW.client_id IS NULL THEN
    NEW.client_id := get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para executar antes do INSERT
CREATE TRIGGER trg_suppliers_set_client_id_before_insert
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_suppliers_set_client_id();

-- Atualizar política RLS para permitir INSERT com client_id do usuário atual
DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;

CREATE POLICY "suppliers_client_insert" 
  ON public.suppliers 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      client_id = get_current_user_client_id() 
      OR get_user_role() = 'admin'
    )
  );