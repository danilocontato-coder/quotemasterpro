-- Remover duplicatas de quote_visits, mantendo apenas a mais recente por (quote_id, supplier_id)
DELETE FROM public.quote_visits
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY quote_id, supplier_id 
             ORDER BY updated_at DESC, created_at DESC
           ) as rn
    FROM public.quote_visits
  ) t
  WHERE t.rn > 1
);

-- Criar índice único para prevenir duplicidade futura
CREATE UNIQUE INDEX IF NOT EXISTS quote_visits_quote_supplier_unique 
ON public.quote_visits(quote_id, supplier_id);

-- Remover constraint antigo e criar novo com todos os status
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check 
CHECK (status IN (
  'draft', 'sent', 'receiving', 'received', 
  'ai_analyzing', 'ai_negotiating', 'negotiation_completed',
  'under_review', 'approved', 'rejected', 
  'finalized', 'cancelled', 'trash',
  'awaiting_visit', 'visit_partial_scheduled', 'visit_scheduled', 
  'visit_partial_confirmed', 'visit_confirmed', 'visit_overdue'
));