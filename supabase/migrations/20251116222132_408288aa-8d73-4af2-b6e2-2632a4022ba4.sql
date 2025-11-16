-- Fix: Remove hyphens from UUID before hexadecimal conversion in advisory lock
CREATE OR REPLACE FUNCTION public.generate_invitation_letter_number(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  new_letter_number TEXT;
  lock_key BIGINT;
BEGIN
  -- Usar advisory lock baseado no client_id para evitar race conditions
  -- CORREÇÃO: Remover hífens do UUID antes de converter para hexadecimal
  lock_key := ('x' || substring(replace(p_client_id::text, '-', ''), 1, 15))::bit(60)::bigint;
  
  -- Adquirir lock exclusivo para este cliente durante a transação
  PERFORM pg_advisory_xact_lock(lock_key);
  
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Obter ou criar contador para este cliente e ano
  INSERT INTO public.client_invitation_letter_counters (client_id, year, current_counter)
  VALUES (p_client_id, current_year, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = CASE 
      WHEN client_invitation_letter_counters.year = current_year 
      THEN client_invitation_letter_counters.current_counter + 1
      ELSE 1
    END,
    year = current_year,
    updated_at = NOW()
  RETURNING current_counter INTO next_counter;
  
  -- Formatar como CC-YYYY-NNN (ex: CC-2025-001)
  new_letter_number := 'CC-' || current_year || '-' || LPAD(next_counter::TEXT, 3, '0');
  
  RETURN new_letter_number;
END;
$function$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.generate_invitation_letter_number(uuid) IS 
'Gera número sequencial de carta convite no formato CC-YYYY-NNN. 
Utiliza advisory lock thread-safe baseado em client_id (sem hífens) para evitar race conditions.';