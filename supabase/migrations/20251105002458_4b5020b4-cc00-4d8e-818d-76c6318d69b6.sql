-- Create storage buckets for invitation letters
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('invitation-attachments', 'invitation-attachments', false),
  ('invitation-responses', 'invitation-responses', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for invitation-attachments bucket
-- Clientes podem fazer upload de anexos para suas cartas
CREATE POLICY "Clients can upload invitation attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT q.id::text
    FROM public.quotes q
    WHERE q.client_id = public.get_current_user_client_id()
  )
);

-- Clientes podem visualizar anexos de suas cartas
CREATE POLICY "Clients can view invitation attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT q.id::text
    FROM public.quotes q
    WHERE q.client_id = public.get_current_user_client_id()
  )
);

-- Fornecedores convidados podem visualizar anexos via token (handled by edge function)
CREATE POLICY "Public access to invitation attachments via token"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'invitation-attachments'
);

-- Clientes podem deletar anexos de suas cartas
CREATE POLICY "Clients can delete invitation attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT q.id::text
    FROM public.quotes q
    WHERE q.client_id = public.get_current_user_client_id()
  )
);

-- RLS Policies for invitation-responses bucket
-- Fornecedores podem fazer upload de respostas
CREATE POLICY "Suppliers can upload response attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invitation-responses'
  AND (storage.foldername(name))[1] IN (
    SELECT ils.invitation_letter_id::text
    FROM public.invitation_letter_suppliers ils
    WHERE ils.supplier_id = public.get_current_user_supplier_id()
  )
);

-- Acesso público via token (para fornecedores não autenticados)
CREATE POLICY "Public upload to invitation responses"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'invitation-responses'
);

-- Clientes podem visualizar respostas de suas cartas
CREATE POLICY "Clients can view response attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invitation-responses'
  AND (storage.foldername(name))[1] IN (
    SELECT il.id::text
    FROM public.invitation_letters il
    WHERE il.client_id = public.get_current_user_client_id()
  )
);

-- Fornecedores podem visualizar suas próprias respostas
CREATE POLICY "Suppliers can view their response attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invitation-responses'
  AND (storage.foldername(name))[1] IN (
    SELECT ils.invitation_letter_id::text
    FROM public.invitation_letter_suppliers ils
    WHERE ils.supplier_id = public.get_current_user_supplier_id()
  )
);

-- Acesso público via token
CREATE POLICY "Public access to response attachments"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'invitation-responses'
);