-- CORREÇÃO URGENTE: Reverter política que causa recursão infinita
-- e criar solução segura usando security definer function

-- 1. Remover política problemática
DROP POLICY IF EXISTS "suppliers_read_client_from_quotes" ON public.clients;

-- 2. Restaurar política original
CREATE POLICY "clients_own_select"
ON public.clients
FOR SELECT
TO public
USING (
  get_user_role() = 'admin'::text
  OR
  id = get_current_user_client_id()
);

-- 3. Criar security definer function para verificar acesso de fornecedor SEM recursão RLS
CREATE OR REPLACE FUNCTION public.supplier_can_read_client(client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verifica se o fornecedor atual tem cotações com este cliente
  SELECT EXISTS (
    SELECT 1 
    FROM quote_suppliers qs
    INNER JOIN quotes q ON q.id = qs.quote_id
    WHERE q.client_id = client_id_param
    AND qs.supplier_id = get_current_user_supplier_id()
  );
$$;

-- 4. Criar política SEPARADA para fornecedores usando a function segura
CREATE POLICY "suppliers_read_client_via_quotes"
ON public.clients
FOR SELECT
TO public
USING (
  get_user_role() = 'supplier'::text
  AND public.supplier_can_read_client(id)
);

-- Comentário explicativo
COMMENT ON FUNCTION public.supplier_can_read_client IS 
'Security definer function que permite fornecedores lerem dados de clientes com quem têm cotações, sem causar recursão infinita nas políticas RLS';