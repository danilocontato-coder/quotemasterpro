-- Remover a constraint de foreign key da tabela permission_profiles
-- e permitir que tanto clients quanto suppliers tenham perfis de permissão

-- Primeiro, remover a constraint existente
ALTER TABLE public.permission_profiles 
DROP CONSTRAINT IF EXISTS permission_profiles_client_id_fkey;

-- Adicionar uma coluna específica para suppliers
ALTER TABLE public.permission_profiles 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);

-- Atualizar a RLS policy para funcionar com ambos client_id e supplier_id
DROP POLICY IF EXISTS "permission_profiles_supplier_access" ON public.permission_profiles;

-- Criar nova política que funciona para ambos
CREATE POLICY "permission_profiles_comprehensive_access"
ON public.permission_profiles
FOR ALL
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
)
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
);