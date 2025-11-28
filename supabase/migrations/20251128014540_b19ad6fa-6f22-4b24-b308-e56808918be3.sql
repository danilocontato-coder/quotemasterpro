-- Trigger para cancelar pagamentos quando cotação é cancelada
CREATE OR REPLACE FUNCTION cancel_payment_on_quote_cancel()
RETURNS TRIGGER AS $$
DECLARE
  payment_record RECORD;
  supplier_profile_id UUID;
BEGIN
  -- Só executar quando status muda para 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    RAISE LOG '[TRIGGER] Quote % cancelada, processando pagamentos...', NEW.id;
    
    -- Buscar e atualizar pagamentos pendentes
    FOR payment_record IN 
      SELECT id, supplier_id, amount, friendly_id, asaas_payment_id
      FROM public.payments 
      WHERE quote_id = NEW.id 
      AND status IN ('pending', 'processing', 'waiting_confirmation', 'overdue')
    LOOP
      -- Atualizar status do pagamento
      UPDATE public.payments 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = payment_record.id;
      
      RAISE LOG '[TRIGGER] Pagamento % marcado como cancelled', payment_record.id;
      
      -- Buscar profile do fornecedor para notificação
      SELECT id INTO supplier_profile_id
      FROM public.profiles
      WHERE supplier_id = payment_record.supplier_id
      LIMIT 1;
      
      -- Criar notificação para fornecedor
      IF supplier_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id,
          supplier_id,
          title,
          message,
          type,
          priority,
          metadata
        ) VALUES (
          supplier_profile_id,
          payment_record.supplier_id,
          'Cotação Cancelada',
          'A cotação #' || COALESCE(NEW.local_code, NEW.id::text) || ' foi cancelada pelo cliente. A cobrança associada foi cancelada automaticamente.',
          'quote_cancelled',
          'high',
          jsonb_build_object(
            'quote_id', NEW.id,
            'quote_code', NEW.local_code,
            'payment_id', payment_record.id,
            'payment_friendly_id', payment_record.friendly_id,
            'amount', payment_record.amount
          )
        );
        
        RAISE LOG '[TRIGGER] Notificação criada para fornecedor %', payment_record.supplier_id;
      END IF;
      
      -- Registrar no audit_logs
      INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        panel_type,
        details
      ) VALUES (
        NULL, -- Sistema
        'PAYMENT_AUTO_CANCELLED',
        'payments',
        payment_record.id,
        'system',
        jsonb_build_object(
          'quote_id', NEW.id,
          'quote_code', NEW.local_code,
          'trigger', 'cancel_payment_on_quote_cancel',
          'reason', 'quote_cancelled_by_client',
          'asaas_payment_id', payment_record.asaas_payment_id
        )
      );
    END LOOP;
    
    -- Também cancelar entregas pendentes
    UPDATE public.deliveries
    SET status = 'cancelled', updated_at = NOW()
    WHERE quote_id = NEW.id
    AND status IN ('pending', 'scheduled');
    
    RAISE LOG '[TRIGGER] Entregas da cotação % canceladas', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trg_cancel_payment_on_quote_cancel ON public.quotes;

CREATE TRIGGER trg_cancel_payment_on_quote_cancel
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION cancel_payment_on_quote_cancel();

-- Comentário explicativo
COMMENT ON FUNCTION cancel_payment_on_quote_cancel() IS 'Cancela automaticamente pagamentos e entregas quando uma cotação é cancelada';
COMMENT ON TRIGGER trg_cancel_payment_on_quote_cancel ON public.quotes IS 'Dispara cancelamento de pagamentos/entregas quando quote.status muda para cancelled';