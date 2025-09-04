-- Enable realtime for quote_responses table
ALTER PUBLICATION supabase_realtime ADD TABLE quote_responses;

-- Set replica identity to full to capture all column changes
ALTER TABLE quote_responses REPLICA IDENTITY FULL;