-- Garantir que o bucket attachments existe e está configurado corretamente
DO $$
BEGIN
    -- Deletar bucket se existir para recriar com configurações corretas
    DELETE FROM storage.buckets WHERE id = 'attachments';
    
    -- Criar bucket público para anexos (mais fácil para debugging)
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attachments', 'attachments', true);
    
    -- Política para permitir leitura pública
    DROP POLICY IF EXISTS "Public attachments access" ON storage.objects;
    CREATE POLICY "Public attachments access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'attachments');
    
    -- Política para permitir upload de usuários autenticados
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    CREATE POLICY "Authenticated users can upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
    -- Política para permitir atualização por usuários autenticados
    DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
    CREATE POLICY "Authenticated users can update" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
    -- Política para permitir exclusão por usuários autenticados
    DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
    CREATE POLICY "Authenticated users can delete" ON storage.objects 
    FOR DELETE USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
    
END $$;