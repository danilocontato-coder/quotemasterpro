-- =====================================================
-- MIGRATION: Invitation Letters Module - Sprint 1 (Idempotent)
-- =====================================================

-- Create ENUM for invitation letter status (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_letter_status') THEN
    CREATE TYPE invitation_letter_status AS ENUM ('draft', 'sent', 'cancelled');
  END IF;
END $$;

-- Create ENUM for supplier response status (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_response_status') THEN
    CREATE TYPE supplier_response_status AS ENUM ('pending', 'accepted', 'declined', 'no_interest');
  END IF;
END $$;

-- =====================================================
-- TABLE: invitation_letters
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_number TEXT UNIQUE,
  quote_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  status invitation_letter_status NOT NULL DEFAULT 'draft',
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitation_letters_client_id ON invitation_letters(client_id);
CREATE INDEX IF NOT EXISTS idx_invitation_letters_quote_id ON invitation_letters(quote_id);
CREATE INDEX IF NOT EXISTS idx_invitation_letters_status ON invitation_letters(status);
CREATE INDEX IF NOT EXISTS idx_invitation_letters_deadline ON invitation_letters(deadline);
CREATE INDEX IF NOT EXISTS idx_invitation_letters_created_at ON invitation_letters(created_at DESC);

-- =====================================================
-- TABLE: invitation_letter_suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_letter_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_letter_id UUID NOT NULL REFERENCES invitation_letters(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  response_status supplier_response_status NOT NULL DEFAULT 'pending',
  response_date TIMESTAMPTZ,
  response_notes TEXT,
  response_attachment_url TEXT,
  response_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invitation_letter_id, supplier_id)
);

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitation_letter_suppliers_letter_id ON invitation_letter_suppliers(invitation_letter_id);
CREATE INDEX IF NOT EXISTS idx_invitation_letter_suppliers_supplier_id ON invitation_letter_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitation_letter_suppliers_response_status ON invitation_letter_suppliers(response_status);
CREATE INDEX IF NOT EXISTS idx_invitation_letter_suppliers_token ON invitation_letter_suppliers(response_token);

-- =====================================================
-- FUNCTION: Generate letter number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_letter_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_counter INTEGER;
  v_letter_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next counter for this client and year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(letter_number FROM 'CC-\d{4}-(\d+)') AS INTEGER
    )
  ), 0) + 1 INTO v_counter
  FROM invitation_letters
  WHERE client_id = p_client_id
    AND letter_number LIKE 'CC-' || v_year || '-%';
  
  -- Format: CC-YYYY-NNN (CC-2025-001)
  v_letter_number := 'CC-' || v_year || '-' || LPAD(v_counter::TEXT, 3, '0');
  
  RETURN v_letter_number;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-generate letter number on insert
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_letter_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.letter_number IS NULL THEN
    NEW.letter_number := generate_letter_number(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_letter_number ON invitation_letters;
CREATE TRIGGER trg_generate_letter_number
  BEFORE INSERT ON invitation_letters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_letter_number();

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_invitation_letters_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_invitation_letters_updated_at ON invitation_letters;
CREATE TRIGGER trg_update_invitation_letters_updated_at
  BEFORE UPDATE ON invitation_letters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invitation_letters_updated_at();

DROP TRIGGER IF EXISTS trg_update_invitation_letter_suppliers_updated_at ON invitation_letter_suppliers;
CREATE TRIGGER trg_update_invitation_letter_suppliers_updated_at
  BEFORE UPDATE ON invitation_letter_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invitation_letters_updated_at();

-- =====================================================
-- FUNCTION: Get invitation letter statistics
-- =====================================================
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

-- =====================================================
-- RLS POLICIES: invitation_letters
-- =====================================================
ALTER TABLE invitation_letters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS invitation_letters_admin_all ON invitation_letters;
DROP POLICY IF EXISTS invitation_letters_client_all ON invitation_letters;
DROP POLICY IF EXISTS invitation_letters_collaborator_insert ON invitation_letters;
DROP POLICY IF EXISTS invitation_letters_collaborator_select ON invitation_letters;
DROP POLICY IF EXISTS invitation_letters_collaborator_update ON invitation_letters;

-- Admin: Full access
CREATE POLICY invitation_letters_admin_all
  ON invitation_letters
  FOR ALL
  USING (get_user_role() = 'admin');

-- Clients/Managers: Full access to their own letters
CREATE POLICY invitation_letters_client_all
  ON invitation_letters
  FOR ALL
  USING (
    client_id = get_current_user_client_id()
    OR client_id IN (
      SELECT id FROM clients WHERE parent_client_id = get_current_user_client_id()
    )
  )
  WITH CHECK (
    client_id = get_current_user_client_id()
    OR client_id IN (
      SELECT id FROM clients WHERE parent_client_id = get_current_user_client_id()
    )
  );

-- Collaborators: Can insert drafts and view their client's letters
CREATE POLICY invitation_letters_collaborator_insert
  ON invitation_letters
  FOR INSERT
  WITH CHECK (
    get_user_role() = 'collaborator'
    AND client_id = get_current_user_client_id()
    AND status = 'draft'
  );

CREATE POLICY invitation_letters_collaborator_select
  ON invitation_letters
  FOR SELECT
  USING (
    get_user_role() = 'collaborator'
    AND client_id = get_current_user_client_id()
  );

-- Collaborators: Can only update drafts they created
CREATE POLICY invitation_letters_collaborator_update
  ON invitation_letters
  FOR UPDATE
  USING (
    get_user_role() = 'collaborator'
    AND client_id = get_current_user_client_id()
    AND status = 'draft'
    AND created_by = auth.uid()
  );

-- =====================================================
-- RLS POLICIES: invitation_letter_suppliers
-- =====================================================
ALTER TABLE invitation_letter_suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS invitation_letter_suppliers_admin_all ON invitation_letter_suppliers;
DROP POLICY IF EXISTS invitation_letter_suppliers_client_all ON invitation_letter_suppliers;
DROP POLICY IF EXISTS invitation_letter_suppliers_supplier_select ON invitation_letter_suppliers;
DROP POLICY IF EXISTS invitation_letter_suppliers_supplier_update ON invitation_letter_suppliers;
DROP POLICY IF EXISTS invitation_letter_suppliers_public_token_select ON invitation_letter_suppliers;
DROP POLICY IF EXISTS invitation_letter_suppliers_public_token_update ON invitation_letter_suppliers;

-- Admin: Full access
CREATE POLICY invitation_letter_suppliers_admin_all
  ON invitation_letter_suppliers
  FOR ALL
  USING (get_user_role() = 'admin');

-- Clients: Full access for their letters
CREATE POLICY invitation_letter_suppliers_client_all
  ON invitation_letter_suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invitation_letters il
      WHERE il.id = invitation_letter_suppliers.invitation_letter_id
        AND (
          il.client_id = get_current_user_client_id()
          OR il.client_id IN (
            SELECT id FROM clients WHERE parent_client_id = get_current_user_client_id()
          )
        )
    )
  );

-- Suppliers: Can view and update only their own invitations
CREATE POLICY invitation_letter_suppliers_supplier_select
  ON invitation_letter_suppliers
  FOR SELECT
  USING (
    get_user_role() = 'supplier'
    AND supplier_id = get_current_user_supplier_id()
  );

CREATE POLICY invitation_letter_suppliers_supplier_update
  ON invitation_letter_suppliers
  FOR UPDATE
  USING (
    get_user_role() = 'supplier'
    AND supplier_id = get_current_user_supplier_id()
  );

-- Public access via token (for supplier response page)
CREATE POLICY invitation_letter_suppliers_public_token_select
  ON invitation_letter_suppliers
  FOR SELECT
  USING (
    response_token IS NOT NULL
    AND token_expires_at > now()
  );

CREATE POLICY invitation_letter_suppliers_public_token_update
  ON invitation_letter_suppliers
  FOR UPDATE
  USING (
    response_token IS NOT NULL
    AND token_expires_at > now()
  );

-- =====================================================
-- STORAGE BUCKET: invitation_letters
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('invitation_letters', 'invitation_letters', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Clients can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Suppliers can view files from their invitations" ON storage.objects;
DROP POLICY IF EXISTS "Suppliers can upload response files" ON storage.objects;

-- Storage policies for attachments
CREATE POLICY "Clients can upload to their own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invitation_letters'
    AND (
      get_user_role() = 'admin'
      OR (storage.foldername(name))[1] IN (
        SELECT client_id::text FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view their own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invitation_letters'
    AND (
      get_user_role() = 'admin'
      OR (storage.foldername(name))[1] IN (
        SELECT client_id::text FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can view files from their invitations"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invitation_letters'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT invitation_letter_id
      FROM invitation_letter_suppliers
      WHERE supplier_id = get_current_user_supplier_id()
    )
  );

CREATE POLICY "Suppliers can upload response files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invitation_letters'
    AND get_user_role() = 'supplier'
    AND (storage.foldername(name))[3] = 'supplier_responses'
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE invitation_letters IS 'Stores invitation letters sent to suppliers for quote participation';
COMMENT ON TABLE invitation_letter_suppliers IS 'Tracks which suppliers received invitations and their responses';