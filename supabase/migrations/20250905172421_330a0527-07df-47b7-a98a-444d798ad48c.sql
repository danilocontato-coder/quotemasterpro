-- Remover todas as políticas de INSERT existentes
DROP POLICY IF EXISTS "quotes_insert_policy_v2" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy_fixed" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;

-- Criar nova política mais simples
CREATE POLICY "quotes_insert_simple" ON public.quotes
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid()
  AND client_id IS NOT NULL
  AND client_id = (
    SELECT p.client_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid() 
    LIMIT 1
  )
);