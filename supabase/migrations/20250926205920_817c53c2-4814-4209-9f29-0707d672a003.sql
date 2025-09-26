-- Permitir que o cliente veja fornecedores "locais" (onde suppliers.client_id = client do usuário)
-- Isso resolve falhas no INSERT ... RETURNING (PostgREST usa SELECT nas linhas retornadas)
DROP POLICY IF EXISTS "suppliers_client_view_own" ON public.suppliers;

CREATE POLICY "suppliers_client_view_own"
  ON public.suppliers
  FOR SELECT
  USING (
    client_id = get_current_user_client_id()
  );