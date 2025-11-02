-- =====================================================
-- FIX: Set search_path for invitation letter functions
-- =====================================================

-- Fix generate_letter_number function
CREATE OR REPLACE FUNCTION generate_letter_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_counter INTEGER;
  v_letter_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(letter_number FROM 'CC-\d{4}-(\d+)') AS INTEGER
    )
  ), 0) + 1 INTO v_counter
  FROM invitation_letters
  WHERE client_id = p_client_id
    AND letter_number LIKE 'CC-' || v_year || '-%';
  
  v_letter_number := 'CC-' || v_year || '-' || LPAD(v_counter::TEXT, 3, '0');
  
  RETURN v_letter_number;
END;
$$;

-- Fix trigger_generate_letter_number function
CREATE OR REPLACE FUNCTION trigger_generate_letter_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.letter_number IS NULL THEN
    NEW.letter_number := generate_letter_number(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix trigger_update_invitation_letters_updated_at function
CREATE OR REPLACE FUNCTION trigger_update_invitation_letters_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_invitation_letter_stats function
CREATE OR REPLACE FUNCTION get_invitation_letter_stats(p_letter_id UUID)
RETURNS TABLE (
  total_suppliers BIGINT,
  sent_count BIGINT,
  viewed_count BIGINT,
  responded_count BIGINT,
  accepted_count BIGINT,
  declined_count BIGINT,
  pending_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_suppliers,
    COUNT(*) FILTER (WHERE sent_at IS NOT NULL)::BIGINT AS sent_count,
    COUNT(*) FILTER (WHERE viewed_at IS NOT NULL)::BIGINT AS viewed_count,
    COUNT(*) FILTER (WHERE response_date IS NOT NULL)::BIGINT AS responded_count,
    COUNT(*) FILTER (WHERE response_status = 'accepted')::BIGINT AS accepted_count,
    COUNT(*) FILTER (WHERE response_status = 'declined')::BIGINT AS declined_count,
    COUNT(*) FILTER (WHERE response_status = 'pending')::BIGINT AS pending_count
  FROM invitation_letter_suppliers
  WHERE invitation_letter_id = p_letter_id;
END;
$$;