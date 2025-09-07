-- Atualizar bucket para ser público e ajustar políticas
DO $$
BEGIN
    -- Atualizar bucket para ser público
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'attachments';
    
    -- Remover políticas antigas se existirem
    DROP POLICY IF EXISTS "ticket_attachments_select" ON storage.objects;
    DROP POLICY IF EXISTS "ticket_attachments_insert" ON storage.objects;
    DROP POLICY IF EXISTS "ticket_attachments_update" ON storage.objects;
    DROP POLICY IF EXISTS "ticket_attachments_delete" ON storage.objects;
    DROP POLICY IF EXISTS "Public attachments access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
    
    -- Política para permitir leitura pública
    CREATE POLICY "Public attachments read" ON storage.objects 
    FOR SELECT USING (bucket_id = 'attachments');
    
    -- Política para permitir upload de usuários autenticados
    CREATE POLICY "Auth users can upload attachments" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
    -- Política para permitir atualização por usuários autenticados
    CREATE POLICY "Auth users can update attachments" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
    -- Política para permitir exclusão por usuários autenticados
    CREATE POLICY "Auth users can delete attachments" ON storage.objects 
    FOR DELETE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
END $$;