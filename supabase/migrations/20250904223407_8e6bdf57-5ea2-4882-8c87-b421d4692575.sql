-- Harden the trigger function with SECURITY DEFINER and stable search_path
CREATE OR REPLACE FUNCTION public.update_quote_responses_count()
RETURNS TRIGGER
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

-- Ensure trigger exists and is bound to this function
DROP TRIGGER IF EXISTS trigger_update_quote_responses_count ON public.quote_responses;
CREATE TRIGGER trigger_update_quote_responses_count
  AFTER INSERT OR DELETE ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_responses_count();

-- One-off backfill to fix existing quotes that already have responses
WITH counts AS (
  SELECT quote_id, COUNT(*)::int AS cnt
  FROM public.quote_responses
  GROUP BY quote_id
)
UPDATE public.quotes q
SET 
  responses_count = c.cnt,
  status = CASE WHEN q.status = 'sent' AND c.cnt > 0 THEN 'receiving' ELSE q.status END,
  updated_at = now()
FROM counts c
WHERE q.id = c.quote_id;

-- Return a quick snapshot for validation
SELECT id, title, status, responses_count FROM public.quotes WHERE id IN ('RFQ02','RFQ03');