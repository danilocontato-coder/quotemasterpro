-- Ensure realtime is enabled for quotes and quote_responses tables
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.quote_responses REPLICA IDENTITY FULL;

-- Add tables to realtime publication
BEGIN;
  -- Try to drop tables from publication (ignore if they don't exist)
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.quotes;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END $$;
  
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.quote_responses;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END $$;
  
  -- Add tables to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_responses;
COMMIT;