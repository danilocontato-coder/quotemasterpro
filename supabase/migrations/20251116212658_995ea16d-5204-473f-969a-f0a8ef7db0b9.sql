-- Drop old incorrect policies for invitation-attachments bucket
DROP POLICY IF EXISTS "Clients can upload invitation attachments" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view invitation attachments" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete invitation attachments" ON storage.objects;
DROP POLICY IF EXISTS "Clients can update invitation attachments" ON storage.objects;

-- Create new correct policies that verify against invitation_letters table
-- Policy for INSERT (upload)
CREATE POLICY "Clients can upload invitation attachments v2"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT il.id::text
    FROM invitation_letters il
    WHERE il.client_id = get_current_user_client_id()
  )
);

-- Policy for SELECT (view/download)
CREATE POLICY "Clients can view invitation attachments v2"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT il.id::text
    FROM invitation_letters il
    WHERE il.client_id = get_current_user_client_id()
  )
);

-- Policy for DELETE
CREATE POLICY "Clients can delete invitation attachments v2"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT il.id::text
    FROM invitation_letters il
    WHERE il.client_id = get_current_user_client_id()
  )
);

-- Policy for UPDATE
CREATE POLICY "Clients can update invitation attachments v2"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invitation-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT il.id::text
    FROM invitation_letters il
    WHERE il.client_id = get_current_user_client_id()
  )
);