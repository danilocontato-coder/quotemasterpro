-- Criar bucket de armazenamento para anexos de contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-attachments', 'contract-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para bucket de anexos de contratos
CREATE POLICY "contract_attachments_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-attachments');

CREATE POLICY "contract_attachments_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'contract-attachments');

CREATE POLICY "contract_attachments_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-attachments');

CREATE POLICY "contract_attachments_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'contract-attachments');