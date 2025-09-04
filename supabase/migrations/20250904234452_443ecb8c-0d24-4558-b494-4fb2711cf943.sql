-- Ensure trigger exists to update quote responses_count and status when proposals are sent
CREATE OR REPLACE FUNCTION public.update_quote_responses_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.quotes
    SET 
      responses_count = (
        SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = NEW.quote_id
      ),
      status = CASE WHEN status = 'sent' THEN 'receiving' ELSE status END,
      updated_at = now()
    WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.quotes
    SET 
      responses_count = (
        SELECT COUNT(*) FROM public.quote_responses WHERE quote_id = OLD.quote_id
      ),
      updated_at = now()
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_quote_responses_count_trigger ON public.quote_responses;

-- Create trigger for quote_responses
CREATE TRIGGER update_quote_responses_count_trigger
AFTER INSERT OR DELETE ON public.quote_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_quote_responses_count();