-- Corrigir search_path da função update_escrow_errors_timestamp
CREATE OR REPLACE FUNCTION update_escrow_errors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;