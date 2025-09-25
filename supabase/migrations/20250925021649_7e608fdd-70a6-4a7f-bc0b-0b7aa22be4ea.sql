-- Função para criar pagamento automático quando cotação é aprovada
CREATE OR REPLACE FUNCTION public.create_automatic_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Só criar pagamento se status mudou para 'approved' e não existir pagamento
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Verificar se já existe pagamento para esta cotação
    IF NOT EXISTS (
      SELECT 1 FROM public.payments WHERE quote_id = NEW.id
    ) THEN
      -- Criar pagamento automático
      INSERT INTO public.payments (
        id,
        quote_id,
        client_id,
        supplier_id,
        amount,
        status
      ) VALUES (
        'PAY-' || NEW.id || '-' || extract(epoch from now())::bigint,
        NEW.id,
        NEW.client_id,
        NEW.supplier_id,
        COALESCE(NEW.total, 0),
        'pending'
      );
      
      -- Log de auditoria
      INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        panel_type,
        details
      ) VALUES (
        'PAYMENT_AUTO_CREATED',
        'payments',
        'PAY-' || NEW.id || '-' || extract(epoch from now())::bigint,
        'system',
        jsonb_build_object(
          'quote_id', NEW.id,
          'amount', COALESCE(NEW.total, 0),
          'trigger', 'quote_approved'
        )
      );
      
      -- Notificar cliente sobre pagamento criado
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Pagamento Criado Automaticamente',
        'Um pagamento foi criado automaticamente para a cotação aprovada #' || NEW.id,
        'payment',
        'normal',
        '/payments',
        jsonb_build_object('quote_id', NEW.id, 'auto_created', true)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela quotes
DROP TRIGGER IF EXISTS trigger_create_automatic_payment ON public.quotes;
CREATE TRIGGER trigger_create_automatic_payment
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_automatic_payment();