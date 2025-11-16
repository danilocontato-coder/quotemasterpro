-- =====================================================
-- Sprint 1: Estrutura de Documentos e Validações (CORRIGIDO)
-- =====================================================

-- 1. Adicionar campos de qualificação à tabela suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
ADD COLUMN IF NOT EXISTS cnpj_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_validation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_validation_due DATE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Criar tabela de documentos dos fornecedores
CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Informações do documento
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Validação
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'expired')),
  validation_data JSONB DEFAULT '{}'::jsonb,
  expiry_date DATE,
  
  -- Auditoria
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Criar tabela de validações de fornecedores
CREATE TABLE IF NOT EXISTS public.supplier_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  validation_type TEXT NOT NULL,
  validation_data JSONB DEFAULT '{}'::jsonb,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  performed_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id ON public.supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_client_id ON public.supplier_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_status ON public.supplier_documents(status);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_document_type ON public.supplier_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_expiry_date ON public.supplier_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_validations_supplier_id ON public.supplier_validations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_validations_client_id ON public.supplier_validations(client_id);
CREATE INDEX IF NOT EXISTS idx_supplier_validations_validation_type ON public.supplier_validations(validation_type);

-- 5. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_supplier_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Trigger para updated_at
DROP TRIGGER IF EXISTS trg_supplier_documents_updated_at ON public.supplier_documents;
CREATE TRIGGER trg_supplier_documents_updated_at
  BEFORE UPDATE ON public.supplier_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_supplier_documents_updated_at();

-- 7. Criar storage bucket (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Habilitar RLS
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_validations ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies para supplier_documents

CREATE POLICY "supplier_documents_admin_all"
ON public.supplier_documents
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "supplier_documents_client_select"
ON public.supplier_documents
FOR SELECT
TO authenticated
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

CREATE POLICY "supplier_documents_client_manage"
ON public.supplier_documents
FOR ALL
TO authenticated
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
)
WITH CHECK (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

CREATE POLICY "supplier_documents_supplier_own"
ON public.supplier_documents
FOR ALL
TO authenticated
USING (supplier_id = get_current_user_supplier_id())
WITH CHECK (supplier_id = get_current_user_supplier_id());

-- 10. RLS Policies para supplier_validations

CREATE POLICY "supplier_validations_admin_all"
ON public.supplier_validations
FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "supplier_validations_client_select"
ON public.supplier_validations
FOR SELECT
TO authenticated
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

CREATE POLICY "supplier_validations_client_insert"
ON public.supplier_validations
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

CREATE POLICY "supplier_validations_supplier_select"
ON public.supplier_validations
FOR SELECT
TO authenticated
USING (supplier_id = get_current_user_supplier_id());

-- 11. RLS Policies para Storage (CORRIGIDO com casts)

CREATE POLICY "supplier_documents_storage_admin_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND get_user_role() = 'admin'
)
WITH CHECK (
  bucket_id = 'supplier-documents'
  AND get_user_role() = 'admin'
);

CREATE POLICY "supplier_documents_storage_client_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND (
    ((storage.foldername(name))[1])::uuid IN (
      SELECT s.id
      FROM public.suppliers s 
      WHERE s.client_id = get_current_user_client_id()
      OR s.client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  )
);

CREATE POLICY "supplier_documents_storage_client_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-documents'
  AND (
    ((storage.foldername(name))[1])::uuid IN (
      SELECT s.id
      FROM public.suppliers s 
      WHERE s.client_id = get_current_user_client_id()
      OR s.client_id IN (
        SELECT id FROM public.clients 
        WHERE parent_client_id = get_current_user_client_id()
      )
    )
  )
);

CREATE POLICY "supplier_documents_storage_supplier_own"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND ((storage.foldername(name))[1])::uuid = get_current_user_supplier_id()
)
WITH CHECK (
  bucket_id = 'supplier-documents'
  AND ((storage.foldername(name))[1])::uuid = get_current_user_supplier_id()
);