-- Ensure realtime is enabled for quotes and quote_responses tables
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.quote_responses REPLICA IDENTITY FULL;

-- Add tables to realtime publication
BEGIN;
  -- Remove tables if they exist in the publication
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.quotes;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.quote_responses;
  
  -- Add tables to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_responses;
COMMIT;