-- ==========================================
-- FASE 1: Corrigir Constraint UNIQUE
-- ==========================================

-- Remover constraint UNIQUE global do letter_number
ALTER TABLE public.invitation_letters 
  DROP CONSTRAINT IF EXISTS invitation_letters_letter_number_key;

-- Adicionar constraint UNIQUE composta (client_id, letter_number)
ALTER TABLE public.invitation_letters 
  ADD CONSTRAINT invitation_letters_client_letter_number_unique 
  UNIQUE (client_id, letter_number);

-- Criar índice para performance em consultas por cliente e número
CREATE INDEX IF NOT EXISTS idx_invitation_letters_client_letter_number 
  ON public.invitation_letters (client_id, letter_number);

-- ==========================================
-- FASE 2: Melhorar Função Thread-Safe
-- ==========================================

CREATE OR REPLACE FUNCTION public.generate_invitation_letter_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  next_counter INTEGER;
  new_letter_number TEXT;
  lock_key BIGINT;
BEGIN
  -- Usar advisory lock baseado no client_id para evitar race conditions
  -- Convertendo UUID em um número inteiro para o lock
  lock_key := ('x' || substring(p_client_id::text, 1, 15))::bit(60)::bigint;
  
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
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.generate_invitation_letter_number(UUID) IS 
'Gera número sequencial único de carta convite por cliente e ano com proteção contra race conditions usando advisory locks';