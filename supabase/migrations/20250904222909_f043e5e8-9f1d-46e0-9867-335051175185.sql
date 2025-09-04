-- Enable realtime for quotes table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;

-- Set replica identity to full for quotes table
ALTER TABLE quotes REPLICA IDENTITY FULL;

-- Create or replace function to update responses_count
CREATE OR REPLACE FUNCTION update_quote_responses_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new quote_response is inserted
  IF TG_OP = 'INSERT' THEN
    UPDATE quotes 
    SET 
      responses_count = (
        SELECT COUNT(*) 
        FROM quote_responses 
        WHERE quote_id = NEW.quote_id
      ),
      status = CASE 
        WHEN status = 'sent' THEN 'receiving'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    RETURN NEW;
  END IF;
  
  -- When a quote_response is deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE quotes 
    SET 
      responses_count = (
        SELECT COUNT(*) 
        FROM quote_responses 
        WHERE quote_id = OLD.quote_id
      ),
      updated_at = now()
    WHERE id = OLD.quote_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update responses_count
DROP TRIGGER IF EXISTS trigger_update_quote_responses_count ON quote_responses;
CREATE TRIGGER trigger_update_quote_responses_count
  AFTER INSERT OR DELETE ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_responses_count();