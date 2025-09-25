-- Ensure payments ID is generated sequentially per client as #PG001
-- 1) Update trigger function to prefix with '#'
CREATE OR REPLACE FUNCTION public.trg_payments_set_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Só gerar ID se estiver vazio ou null
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    -- Usar a função que gera ID por cliente e prefixar '#'
    NEW.id := '#' || public.next_payment_id_by_client(NEW.client_id, 'PG');
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Create the trigger on payments (id auto-set BEFORE INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'before_insert_set_payment_id'
  ) THEN
    CREATE TRIGGER before_insert_set_payment_id
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_payments_set_id();
  END IF;
END $$;

-- 3) Backfill: assign sequential IDs to existing payments that don't follow the new pattern
WITH ordered AS (
  SELECT p.id AS old_id, p.client_id,
         ROW_NUMBER() OVER (PARTITION BY p.client_id ORDER BY p.created_at) AS rn
  FROM public.payments p
), new_ids AS (
  SELECT old_id,
         '#PG' || LPAD(rn::text, 3, '0') AS new_id,
         client_id,
         rn
  FROM ordered
)
UPDATE public.payments p
SET id = n.new_id
FROM new_ids n
WHERE p.id = n.old_id
  AND p.id NOT LIKE '#PG%';

-- 4) Sync counters to reflect the latest assigned numbers
INSERT INTO public.client_payment_counters (client_id, current_counter, created_at, updated_at)
SELECT client_id, MAX(rn), now(), now()
FROM (
  SELECT client_id,
         ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at) AS rn
  FROM public.payments
) x
GROUP BY client_id
ON CONFLICT (client_id)
DO UPDATE SET current_counter = GREATEST(client_payment_counters.current_counter, EXCLUDED.current_counter),
              updated_at = now();