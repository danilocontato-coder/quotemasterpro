-- Add SECURITY DEFINER to generate_invitation_letter_number function
-- This allows the function to execute with elevated privileges, bypassing RLS when managing counters

CREATE OR REPLACE FUNCTION generate_invitation_letter_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_counter INTEGER;
  v_letter_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insert or update counter with atomic operation
  INSERT INTO client_invitation_letter_counters (client_id, current_counter, year)
  VALUES (p_client_id, 1, v_year)
  ON CONFLICT (client_id) DO UPDATE
  SET 
    current_counter = CASE
      WHEN client_invitation_letter_counters.year = v_year 
      THEN client_invitation_letter_counters.current_counter + 1
      ELSE 1
    END,
    year = v_year,
    updated_at = NOW()
  RETURNING current_counter INTO v_counter;
  
  -- Format: CC-YYYY-NNN (CC-2025-001)
  v_letter_number := 'CC-' || v_year || '-' || LPAD(v_counter::TEXT, 3, '0');
  
  RETURN v_letter_number;
END;
$$;