-- Corrigir políticas RLS da tabela client_suppliers para permitir INSERT de associações
-- O erro de Association ocorre porque o INSERT na client_suppliers pode estar bloqueado

-- Verificar política atual e recriar para permitir INSERT quando client_id corresponde ao usuário atual
DROP POLICY IF EXISTS "client_suppliers_client_access" ON public.client_suppliers;

-- Política unificada para acesso completo do cliente às suas associações
CREATE POLICY "client_suppliers_client_access" 
  ON public.client_suppliers 
  FOR ALL
  USING (client_id = get_current_user_client_id())
  WITH CHECK (client_id = get_current_user_client_id());

-- Política específica para INSERT de associações (redundante mas garante permissão)
DROP POLICY IF EXISTS "client_suppliers_insert_own" ON public.client_suppliers;

CREATE POLICY "client_suppliers_insert_own"
  ON public.client_suppliers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND client_id = get_current_user_client_id()
  );