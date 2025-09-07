-- Storage RLS policies for attachments bucket (tickets/*)
-- Allow authenticated users to upload and read objects under tickets/ path

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Attachments: authenticated can insert tickets'
  ) THEN
    CREATE POLICY "Attachments: authenticated can insert tickets"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'attachments' 
        AND (name ILIKE 'tickets/%')
      );
  END IF;
END $$;

-- SELECT policy (for listing and creating signed URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Attachments: authenticated can select tickets'
  ) THEN
    CREATE POLICY "Attachments: authenticated can select tickets"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'attachments' 
        AND (name ILIKE 'tickets/%')
      );
  END IF;
END $$;