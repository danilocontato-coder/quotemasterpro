-- Drop existing trigger first
DROP TRIGGER IF EXISTS trg_generate_invitation_letter_number ON invitation_letters;

-- Drop old functions
DROP FUNCTION IF EXISTS trigger_generate_invitation_letter_number();
DROP FUNCTION IF EXISTS generate_letter_number(UUID);
DROP FUNCTION IF EXISTS generate_invitation_letter_number(UUID);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all invitation letter counters" ON client_invitation_letter_counters;
DROP POLICY IF EXISTS "Clients can view their invitation letter counters" ON client_invitation_letter_counters;

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS client_invitation_letter_counters (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_invitation_letter_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Admins can manage all invitation letter counters"
ON client_invitation_letter_counters
FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "Clients can view their invitation letter counters"
ON client_invitation_letter_counters
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_invitation_letter_counters_client_year 
ON client_invitation_letter_counters(client_id, year);

-- New ATOMIC function with row-level lock
CREATE OR REPLACE FUNCTION generate_invitation_letter_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
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

-- New trigger function
CREATE OR REPLACE FUNCTION trigger_generate_invitation_letter_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.letter_number IS NULL THEN
    NEW.letter_number := generate_invitation_letter_number(NEW.client_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_generate_invitation_letter_number
  BEFORE INSERT ON invitation_letters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_invitation_letter_number();

-- Migrate existing data - populate counters for clients with existing letters
INSERT INTO client_invitation_letter_counters (client_id, current_counter, year)
SELECT 
  client_id,
  COALESCE(
    MAX(CAST(SUBSTRING(letter_number FROM 'CC-\d{4}-(\d+)') AS INTEGER)),
    0
  ) as current_counter,
  EXTRACT(YEAR FROM CURRENT_DATE) as year
FROM invitation_letters
WHERE letter_number IS NOT NULL
GROUP BY client_id
ON CONFLICT (client_id) DO UPDATE
SET 
  current_counter = EXCLUDED.current_counter,
  updated_at = NOW();