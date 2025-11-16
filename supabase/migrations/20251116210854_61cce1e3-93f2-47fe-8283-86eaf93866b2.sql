-- Adicionar colunas de tracking de documentação à invitation_letter_suppliers
ALTER TABLE invitation_letter_suppliers
ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'not_checked' CHECK (document_status IN ('not_checked', 'eligible', 'pending', 'ineligible')),
ADD COLUMN IF NOT EXISTS document_validation_notes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_despite_docs BOOLEAN DEFAULT false;

COMMENT ON COLUMN invitation_letter_suppliers.document_status IS 'Status de elegibilidade do fornecedor para esta carta específica';
COMMENT ON COLUMN invitation_letter_suppliers.document_validation_notes IS 'Detalhes de validação por tipo de documento';
COMMENT ON COLUMN invitation_letter_suppliers.validated_at IS 'Data da última validação de documentos';
COMMENT ON COLUMN invitation_letter_suppliers.sent_despite_docs IS 'Se foi enviado mesmo sem todos os documentos validados';

-- Função para calcular elegibilidade contextual de um fornecedor para uma carta específica
CREATE OR REPLACE FUNCTION get_supplier_eligibility_for_letter(
  p_supplier_id UUID,
  p_client_id UUID,
  p_required_docs JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_doc JSONB;
  v_doc_type TEXT;
  v_doc_mandatory BOOLEAN;
  v_doc_label TEXT;
  v_supplier_doc RECORD;
  v_details JSONB := '[]'::JSONB;
  v_eligible BOOLEAN := true;
  v_status TEXT := 'eligible';
  v_missing_count INT := 0;
  v_pending_count INT := 0;
  v_rejected_count INT := 0;
  v_expired_count INT := 0;
  v_validated_count INT := 0;
BEGIN
  -- Iterar sobre cada documento obrigatório
  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_required_docs)
  LOOP
    v_doc_type := v_doc->>'type';
    v_doc_mandatory := COALESCE((v_doc->>'mandatory')::BOOLEAN, false);
    v_doc_label := v_doc->>'label';
    
    -- Buscar documento do fornecedor
    SELECT * INTO v_supplier_doc
    FROM supplier_documents
    WHERE supplier_id = p_supplier_id
      AND client_id = p_client_id
      AND document_type = v_doc_type
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Avaliar status do documento
    IF v_supplier_doc.id IS NULL THEN
      -- Documento faltando
      v_details := v_details || jsonb_build_object(
        'type', v_doc_type,
        'label', v_doc_label,
        'mandatory', v_doc_mandatory,
        'status', 'missing',
        'reason', 'Documento não enviado'
      );
      IF v_doc_mandatory THEN
        v_eligible := false;
        v_status := 'ineligible';
        v_missing_count := v_missing_count + 1;
      END IF;
    ELSIF v_supplier_doc.expiry_date IS NOT NULL AND v_supplier_doc.expiry_date < CURRENT_DATE THEN
      -- Documento expirado
      v_details := v_details || jsonb_build_object(
        'type', v_doc_type,
        'label', v_doc_label,
        'mandatory', v_doc_mandatory,
        'status', 'expired',
        'expiry_date', v_supplier_doc.expiry_date,
        'reason', 'Documento expirado'
      );
      IF v_doc_mandatory THEN
        v_eligible := false;
        v_status := 'ineligible';
        v_expired_count := v_expired_count + 1;
      END IF;
    ELSIF v_supplier_doc.status = 'rejected' THEN
      -- Documento rejeitado
      v_details := v_details || jsonb_build_object(
        'type', v_doc_type,
        'label', v_doc_label,
        'mandatory', v_doc_mandatory,
        'status', 'rejected',
        'rejection_reason', v_supplier_doc.rejection_reason,
        'reason', COALESCE(v_supplier_doc.rejection_reason, 'Documento rejeitado')
      );
      IF v_doc_mandatory THEN
        v_eligible := false;
        v_status := 'ineligible';
        v_rejected_count := v_rejected_count + 1;
      END IF;
    ELSIF v_supplier_doc.status = 'pending' THEN
      -- Documento pendente de validação
      v_details := v_details || jsonb_build_object(
        'type', v_doc_type,
        'label', v_doc_label,
        'mandatory', v_doc_mandatory,
        'status', 'pending',
        'file_url', v_supplier_doc.file_url,
        'uploaded_at', v_supplier_doc.created_at,
        'reason', 'Aguardando validação'
      );
      IF v_doc_mandatory THEN
        v_eligible := false;
        IF v_status = 'eligible' THEN
          v_status := 'pending';
        END IF;
        v_pending_count := v_pending_count + 1;
      END IF;
    ELSIF v_supplier_doc.status = 'validated' THEN
      -- Documento validado
      v_details := v_details || jsonb_build_object(
        'type', v_doc_type,
        'label', v_doc_label,
        'mandatory', v_doc_mandatory,
        'status', 'validated',
        'file_url', v_supplier_doc.file_url,
        'validated_at', v_supplier_doc.validated_at,
        'expiry_date', v_supplier_doc.expiry_date
      );
      v_validated_count := v_validated_count + 1;
    END IF;
  END LOOP;
  
  -- Montar resultado
  v_result := jsonb_build_object(
    'eligible', v_eligible,
    'status', v_status,
    'details', v_details,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(p_required_docs),
      'validated', v_validated_count,
      'pending', v_pending_count,
      'missing', v_missing_count,
      'rejected', v_rejected_count,
      'expired', v_expired_count
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supplier_eligibility_for_letter IS 'Calcula elegibilidade contextual de um fornecedor para uma carta convite específica';