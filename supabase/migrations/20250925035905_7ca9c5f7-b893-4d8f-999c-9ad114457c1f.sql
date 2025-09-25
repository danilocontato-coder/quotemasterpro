-- Corrigir RLS policies para permission_profiles para funcionar com fornecedores
-- Adicionar política para fornecedores
CREATE POLICY "permission_profiles_supplier_access"
ON public.permission_profiles
FOR ALL
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  -- Permitir fornecedores acessarem seus próprios perfis de permissão
  (client_id = get_current_user_supplier_id())
)
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  -- Permitir fornecedores criarem seus próprios perfis de permissão
  (client_id = get_current_user_supplier_id())
);

-- Atualizar função do hook para permitir fornecedores criarem perfis para seus usuários
-- usando supplier_id no campo client_id (reutilizando a estrutura existente)