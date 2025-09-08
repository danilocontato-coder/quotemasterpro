-- Atualizar política de deleção para permitir que usuários deletem suas próprias cotações
-- independente do status (não só draft)
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE 
USING (
  (get_user_role() = 'admin'::text) 
  OR 
  (
    client_id IN (
      SELECT profiles.client_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ) 
    AND created_by = auth.uid()
  )
);