-- Verificar se o bucket attachments existe e criar se não existir
DO $$
BEGIN
    -- Tentar inserir o bucket, ignorando se já existir
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attachments', 'attachments', false)
    ON CONFLICT (id) DO NOTHING;
    
    -- Verificar se as policies existem e criar se necessário
    -- Policy para SELECT (leitura de arquivos)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'ticket_attachments_select'
    ) THEN
        EXECUTE 'CREATE POLICY "ticket_attachments_select" ON storage.objects 
                 FOR SELECT USING (bucket_id = ''attachments'' AND auth.uid() IS NOT NULL)';
    END IF;
    
    -- Policy para INSERT (upload de arquivos)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'ticket_attachments_insert'
    ) THEN
        EXECUTE 'CREATE POLICY "ticket_attachments_insert" ON storage.objects 
                 FOR INSERT WITH CHECK (bucket_id = ''attachments'' AND auth.uid() IS NOT NULL)';
    END IF;
    
    -- Policy para UPDATE (atualização de arquivos)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'ticket_attachments_update'
    ) THEN
        EXECUTE 'CREATE POLICY "ticket_attachments_update" ON storage.objects 
                 FOR UPDATE USING (bucket_id = ''attachments'' AND auth.uid() IS NOT NULL)';
    END IF;
    
    -- Policy para DELETE (remoção de arquivos)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'ticket_attachments_delete'
    ) THEN
        EXECUTE 'CREATE POLICY "ticket_attachments_delete" ON storage.objects 
                 FOR DELETE USING (bucket_id = ''attachments'' AND auth.uid() IS NOT NULL)';
    END IF;
    
END $$;