-- Corrigir negociações existentes com valor original zerado
UPDATE public.ai_negotiations 
SET original_amount = (
  SELECT MIN(qr.total_amount) 
  FROM quote_responses qr 
  WHERE qr.quote_id = ai_negotiations.quote_id
  AND qr.total_amount > 0
)
WHERE original_amount = 0 
AND EXISTS (
  SELECT 1 FROM quote_responses qr 
  WHERE qr.quote_id = ai_negotiations.quote_id 
  AND qr.total_amount > 0
);