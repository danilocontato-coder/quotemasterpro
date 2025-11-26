-- =====================================================
-- Correção do Fluxo de Status de Cotações
-- =====================================================

-- Parte 1: Atualizar constraint com todos os status
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN (
    'draft',
    'sent',
    'receiving',
    'received',
    'under_review',
    'approved',
    'delivering',
    'paid',
    'finalized',
    'rejected',
    'cancelled',
    'archived',
    'ai_analyzing',
    'visit_confirmed',
    'visit_partial_scheduled'
  ));

-- Parte 2: Corrigir função update_quote_status_on_payment
DROP FUNCTION IF EXISTS update_quote_status_on_payment() CASCADE;

CREATE OR REPLACE FUNCTION update_quote_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando pagamento entra em escrow, cotação MANTÉM 'approved'
  IF (OLD.status IS DISTINCT FROM 'in_escrow' AND NEW.status = 'in_escrow') THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'PAYMENT_ESCROW',
      'payments',
      NEW.id::text,
      'supplier',
      jsonb_build_object(
        'quote_id', NEW.quote_id,
        'payment_status', NEW.status,
        'note', 'Pagamento em custódia, cotação mantém status approved'
      )
    );
  END IF;

  -- Quando pagamento é completado (entrega confirmada), cotação vai para 'finalized'
  IF (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    UPDATE public.quotes 
    SET 
      status = 'finalized',
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'QUOTE_FINALIZED',
      'quotes',
      NEW.quote_id::text,
      'system',
      jsonb_build_object(
        'payment_id', NEW.id,
        'payment_status', NEW.status,
        'note', 'Cotação finalizada após confirmação de entrega'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_quote_status_on_payment ON payments;
CREATE TRIGGER trigger_update_quote_status_on_payment
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_status_on_payment();

-- Parte 3: Criar função para atualizar cotação quando entrega é agendada
CREATE OR REPLACE FUNCTION update_quote_status_on_delivery_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando entrega passa de 'pending' para 'scheduled', cotação vai para 'delivering'
  IF (OLD.status = 'pending' AND NEW.status = 'scheduled') THEN
    UPDATE public.quotes 
    SET 
      status = 'delivering',
      updated_at = now()
    WHERE id = NEW.quote_id;
    
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'QUOTE_DELIVERING',
      'quotes',
      NEW.quote_id::text,
      'supplier',
      jsonb_build_object(
        'delivery_id', NEW.id,
        'scheduled_date', NEW.scheduled_date,
        'note', 'Cotação mudou para delivering após agendamento de entrega'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_quote_status_on_delivery_scheduled ON deliveries;
CREATE TRIGGER trigger_update_quote_status_on_delivery_scheduled
  AFTER UPDATE OF status ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_status_on_delivery_scheduled();

-- Parte 4: Corrigir status da RFQ16 (entrega já está agendada)
UPDATE public.quotes 
SET status = 'delivering', updated_at = now()
WHERE local_code = 'RFQ16' 
  AND status = 'approved'
  AND EXISTS (
    SELECT 1 FROM deliveries 
    WHERE deliveries.quote_id = quotes.id 
      AND deliveries.status = 'scheduled'
  );

-- Log da correção
INSERT INTO audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
)
SELECT 
  'QUOTE_STATUS_CORRECTED',
  'quotes',
  id::text,
  'system',
  jsonb_build_object(
    'local_code', local_code,
    'old_status', 'approved',
    'new_status', 'delivering',
    'reason', 'Correção de status - entrega já agendada'
  )
FROM public.quotes
WHERE local_code = 'RFQ16' AND status = 'delivering';