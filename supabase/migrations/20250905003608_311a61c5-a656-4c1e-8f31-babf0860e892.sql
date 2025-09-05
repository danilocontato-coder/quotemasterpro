-- Enable realtime for quote_responses table
ALTER TABLE public.quote_responses REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_responses;

-- Enable realtime for quotes table 
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

-- Add quotes table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;

-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;