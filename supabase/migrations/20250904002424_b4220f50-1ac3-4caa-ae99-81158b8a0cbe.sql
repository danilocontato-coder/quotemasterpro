-- Adicionar política RLS para permitir exclusão de integrações
CREATE POLICY "integrations_delete" 
ON public.integrations 
FOR DELETE 
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (
    SELECT profiles.client_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )) OR 
  (supplier_id IN (
    SELECT profiles.supplier_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ))
);