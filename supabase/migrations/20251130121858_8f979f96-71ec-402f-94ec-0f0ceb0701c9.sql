-- =====================================================
-- TABELA: quote_attachments
-- Sistema de anexos para cotações
-- =====================================================

CREATE TABLE public.quote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  document_type TEXT DEFAULT 'document',
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  
  CONSTRAINT valid_document_type CHECK (
    document_type IN ('document', 'proposal', 'invoice', 'contract', 'specification', 'image', 'other')
  )
);

-- Índices para performance
CREATE INDEX idx_quote_attachments_quote_id ON public.quote_attachments(quote_id);
CREATE INDEX idx_quote_attachments_client_id ON public.quote_attachments(client_id);
CREATE INDEX idx_quote_attachments_uploaded_by ON public.quote_attachments(uploaded_by);

-- Habilitar RLS
ALTER TABLE public.quote_attachments ENABLE ROW LEVEL SECURITY;

-- Trigger para auto-definir client_id baseado na quote
CREATE OR REPLACE FUNCTION public.trg_quote_attachments_set_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT q.client_id 
      FROM public.quotes q 
      WHERE q.id = NEW.quote_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_attachments_set_client_id
BEFORE INSERT ON public.quote_attachments
FOR EACH ROW
EXECUTE FUNCTION public.trg_quote_attachments_set_client_id();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Admin: acesso total
CREATE POLICY "quote_attachments_admin_all" ON public.quote_attachments
  FOR ALL USING (public.has_any_role(ARRAY['admin', 'super_admin']));

-- Clientes: veem anexos das suas cotações
CREATE POLICY "quote_attachments_client_select" ON public.quote_attachments
  FOR SELECT USING (
    client_id = public.get_current_user_client_id()
    OR EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_attachments.quote_id 
      AND q.on_behalf_of_client_id = public.get_current_user_client_id()
    )
  );

-- Clientes: podem anexar nas suas cotações
CREATE POLICY "quote_attachments_client_insert" ON public.quote_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_attachments.quote_id 
      AND (
        q.client_id = public.get_current_user_client_id() 
        OR q.on_behalf_of_client_id = public.get_current_user_client_id()
      )
    )
  );

-- Clientes: podem deletar seus próprios anexos
CREATE POLICY "quote_attachments_client_delete" ON public.quote_attachments
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR client_id = public.get_current_user_client_id()
  );

-- Fornecedores: veem anexos das cotações que foram convidados
CREATE POLICY "quote_attachments_supplier_select" ON public.quote_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quote_suppliers qs
      WHERE qs.quote_id = quote_attachments.quote_id
      AND qs.supplier_id = public.get_current_user_supplier_id()
    )
  );

-- =====================================================
-- STORAGE BUCKET: quote-attachments
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-attachments', 
  'quote-attachments', 
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies
CREATE POLICY "quote_attachments_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'quote-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "quote_attachments_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "quote_attachments_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'quote-attachments' AND auth.uid() IS NOT NULL);