-- ============================================================
-- NORMALIZAÇÃO DE TOASTS E NOTIFICAÇÕES
-- ============================================================
-- Remove triggers duplicados e ajusta notificações para usar RFQ

-- ============================================================
-- FASE 1: Desativar triggers redundantes de notificação
-- ============================================================

-- Remover trigger que duplica notificações de aprovação
DROP TRIGGER IF EXISTS trg_notify_approval_status ON public.approvals;
DROP FUNCTION IF EXISTS public.notify_approval_status();

-- Modificar trigger de mudança de status de cotação para NÃO notificar 'approved'
-- (isso já é gerenciado pelo ApprovalService.ts)
DROP TRIGGER IF EXISTS trg_notify_quote_status_change ON public.quotes;
DROP FUNCTION IF EXISTS public.notify_quote_status_change();

CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  quote_code TEXT;
BEGIN
  -- Só processa se o status realmente mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- ❌ NÃO notificar para 'approved' (já gerenciado por ApprovalService)
  IF NEW.status = 'approved' THEN
    RETURN NEW;
  END IF;
  
  -- Determinar código legível da cotação
  quote_code := COALESCE(NEW.local_code, SUBSTRING(NEW.id::text, 1, 8));
  
  -- Notificar apenas para outros status relevantes
  IF NEW.status IN ('sent', 'receiving', 'rejected', 'cancelled') THEN
    -- Buscar criador da cotação
    SELECT id, name INTO user_record
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    IF user_record IS NOT NULL THEN
      -- Mensagens personalizadas por status
      CASE NEW.status
        WHEN 'sent' THEN
          PERFORM public.notify_client_users(
            NEW.client_id,
            'Cotação Enviada',
            'A cotação #' || quote_code || ' foi enviada aos fornecedores',
            'info',
            '/quotes?id=' || NEW.id
          );
        WHEN 'receiving' THEN
          PERFORM public.notify_client_users(
            NEW.client_id,
            'Proposta Recebida',
            'Nova proposta recebida para a cotação #' || quote_code,
            'info',
            '/quotes?id=' || NEW.id
          );
        WHEN 'rejected' THEN
          INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
          VALUES (
            NEW.created_by,
            'Cotação Rejeitada',
            'A cotação #' || quote_code || ' foi rejeitada',
            'quote_rejected',
            'high',
            '/quotes?id=' || NEW.id,
            jsonb_build_object('quote_id', NEW.id, 'quote_code', quote_code)
          );
        WHEN 'cancelled' THEN
          INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
          VALUES (
            NEW.created_by,
            'Cotação Cancelada',
            'A cotação #' || quote_code || ' foi cancelada',
            'quote_cancelled',
            'normal',
            '/quotes?id=' || NEW.id,
            jsonb_build_object('quote_id', NEW.id, 'quote_code', quote_code)
          );
      END CASE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_quote_status_change
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_quote_status_change();

-- ============================================================
-- FASE 2: Suprimir notificação de pagamento automático
-- ============================================================

DROP TRIGGER IF EXISTS trigger_create_automatic_payment ON public.quotes;
DROP FUNCTION IF EXISTS public.create_automatic_payment();

CREATE OR REPLACE FUNCTION public.create_automatic_payment()
RETURNS TRIGGER AS $$
DECLARE
  next_payment_number TEXT;
  quote_code TEXT;
BEGIN
  -- Só executa quando status muda para 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Verificar se já existe pagamento para esta cotação
    IF NOT EXISTS (SELECT 1 FROM public.payments WHERE quote_id = NEW.id) THEN
      
      -- Gerar número sequencial do pagamento
      SELECT LPAD((COALESCE(MAX(CAST(SUBSTRING(local_code FROM 4) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
      INTO next_payment_number
      FROM public.payments
      WHERE client_id = NEW.client_id;
      
      -- Inserir novo pagamento
      INSERT INTO public.payments (
        quote_id,
        client_id,
        supplier_id,
        amount,
        status,
        payment_method,
        local_code
      ) VALUES (
        NEW.id,
        NEW.client_id,
        NEW.supplier_id,
        NEW.total,
        'pending',
        'boleto',
        'PAY' || next_payment_number
      );
      
      -- Registrar em audit_logs (sem notificação visual)
      quote_code := COALESCE(NEW.local_code, SUBSTRING(NEW.id::text, 1, 8));
      
      INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        panel_type,
        details
      ) VALUES (
        NEW.created_by,
        'PAYMENT_AUTO_CREATED',
        'payments',
        NEW.id,
        'client',
        jsonb_build_object(
          'quote_id', NEW.id,
          'quote_code', quote_code,
          'amount', NEW.total,
          'trigger', 'automatic_on_approval'
        )
      );
      
      -- ❌ REMOVIDA notificação imediata de "Pagamento Criado"
      -- Usuário verá isso apenas na tela de pagamentos
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_automatic_payment
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_automatic_payment();

-- ============================================================
-- Comentário final
-- ============================================================
COMMENT ON FUNCTION public.notify_quote_status_change() IS 
  'Notifica mudanças de status de cotação, EXCETO approved (gerenciado por ApprovalService)';

COMMENT ON FUNCTION public.create_automatic_payment() IS 
  'Cria pagamento automaticamente ao aprovar cotação, SEM notificação visual imediata';