-- Vamos verificar e corrigir a política RLS
-- Primeiro, vamos ver se existe algum problema na RLS atual

-- Verificar se a função get_user_role está funcionando corretamente
SELECT public.get_user_role() as current_role;

-- Verificar a política atual
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'quotes' AND cmd = 'INSERT';

-- Vamos criar uma versão mais simples e direta da política
DROP POLICY IF EXISTS "quotes_insert_policy_fixed" ON public.quotes;

-- Nova política mais simples e direta
CREATE POLICY "quotes_insert_policy_v2" ON public.quotes
FOR INSERT 
WITH CHECK (
  -- Verificações básicas
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid()
  AND client_id IS NOT NULL
  -- Verificação se o usuário tem profile e o client_id bate
  AND client_id = (
    SELECT p.client_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid() 
    LIMIT 1
  )
);