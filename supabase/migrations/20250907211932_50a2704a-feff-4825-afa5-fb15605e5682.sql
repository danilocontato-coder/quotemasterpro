-- Sistema completo de notificações automáticas
-- Função para criar notificações
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    priority,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_action_url,
    p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Função para notificar todos os usuários de um cliente
CREATE OR REPLACE FUNCTION public.notify_client_users(
  p_client_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    priority,
    action_url,
    metadata
  )
  SELECT 
    p.id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_action_url,
    p_metadata
  FROM public.profiles p
  WHERE p.client_id = p_client_id 
    AND p.active = true;
END;
$$;

-- Trigger para notificar sobre novas cotações
CREATE OR REPLACE FUNCTION public.notify_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar usuários do cliente sobre nova cotação
  PERFORM public.notify_client_users(
    NEW.client_id,
    'Nova Cotação Criada',
    'A cotação #' || NEW.id || ' foi criada: ' || NEW.title,
    'quote',
    'normal',
    '/quotes',
    jsonb_build_object('quote_id', NEW.id, 'quote_title', NEW.title)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre atualizações de status de cotação
CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_text TEXT;
  message_text TEXT;
  notification_type TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Definir textos baseado no status
  CASE NEW.status
    WHEN 'sent' THEN
      status_text := 'Enviada para Fornecedores';
      message_text := 'A cotação #' || NEW.id || ' foi enviada para os fornecedores';
      notification_type := 'info';
    WHEN 'receiving' THEN
      status_text := 'Recebendo Propostas';
      message_text := 'A cotação #' || NEW.id || ' está recebendo propostas dos fornecedores';
      notification_type := 'info';
    WHEN 'received' THEN
      status_text := 'Propostas Recebidas';
      message_text := 'Todas as propostas para a cotação #' || NEW.id || ' foram recebidas';
      notification_type := 'success';
    WHEN 'approved' THEN
      status_text := 'Cotação Aprovada';
      message_text := 'A cotação #' || NEW.id || ' foi aprovada';
      notification_type := 'success';
    WHEN 'rejected' THEN
      status_text := 'Cotação Rejeitada';
      message_text := 'A cotação #' || NEW.id || ' foi rejeitada';
      notification_type := 'warning';
    ELSE
      RETURN NEW; -- Não notificar para outros status
  END CASE;
  
  -- Notificar usuários do cliente
  PERFORM public.notify_client_users(
    NEW.client_id,
    status_text,
    message_text,
    notification_type,
    CASE WHEN NEW.status IN ('approved', 'rejected') THEN 'high' ELSE 'normal' END,
    '/quotes',
    jsonb_build_object('quote_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre novas respostas de cotação
CREATE OR REPLACE FUNCTION public.notify_new_quote_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
BEGIN
  -- Buscar informações da cotação
  SELECT * INTO quote_record FROM public.quotes WHERE id = NEW.quote_id;
  
  IF quote_record IS NOT NULL THEN
    -- Notificar usuários do cliente
    PERFORM public.notify_client_users(
      quote_record.client_id,
      'Nova Proposta Recebida',
      'O fornecedor ' || NEW.supplier_name || ' enviou uma proposta para a cotação #' || NEW.quote_id,
      'proposal',
      'normal',
      '/quotes',
      jsonb_build_object('quote_id', NEW.quote_id, 'supplier_name', NEW.supplier_name, 'amount', NEW.total_amount)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre aprovações
CREATE OR REPLACE FUNCTION public.notify_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  approver_name TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar informações da cotação e aprovador
  SELECT q.*, p.name as approver_name 
  INTO quote_record
  FROM public.quotes q
  LEFT JOIN public.profiles p ON p.id = NEW.approver_id
  WHERE q.id = NEW.quote_id;
  
  IF quote_record IS NOT NULL THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Cotação Aprovada',
          'A cotação #' || NEW.quote_id || ' foi aprovada por ' || COALESCE(quote_record.approver_name, 'um aprovador'),
          'success',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'approver', quote_record.approver_name)
        );
      WHEN 'rejected' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Cotação Rejeitada',
          'A cotação #' || NEW.quote_id || ' foi rejeitada por ' || COALESCE(quote_record.approver_name, 'um aprovador'),
          'warning',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'approver', quote_record.approver_name, 'comments', NEW.comments)
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre novos tickets
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar administradores sobre novo ticket
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    priority,
    action_url,
    metadata
  )
  SELECT 
    p.id,
    'Novo Ticket de Suporte',
    'Ticket #' || NEW.id || ' criado: ' || NEW.subject,
    'ticket',
    CASE WHEN NEW.priority = 'urgent' THEN 'high' ELSE 'normal' END,
    '/admin/communication',
    jsonb_build_object('ticket_id', NEW.id, 'client_name', NEW.client_name, 'priority', NEW.priority)
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.active = true;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre mensagens de ticket
CREATE OR REPLACE FUNCTION public.notify_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  -- Buscar informações do ticket
  SELECT * INTO ticket_record FROM public.support_tickets WHERE id = NEW.ticket_id;
  
  IF ticket_record IS NOT NULL THEN
    IF NEW.is_internal THEN
      -- Mensagem interna (suporte) - notificar cliente
      PERFORM public.notify_client_users(
        ticket_record.client_id,
        'Resposta do Suporte',
        'Você recebeu uma resposta no ticket #' || NEW.ticket_id,
        'ticket',
        'normal',
        '/communication',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'sender_name', NEW.sender_name)
      );
    ELSE
      -- Mensagem do cliente - notificar administradores
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        priority,
        action_url,
        metadata
      )
      SELECT 
        p.id,
        'Nova Mensagem no Ticket',
        'Nova mensagem no ticket #' || NEW.ticket_id || ' de ' || COALESCE(NEW.sender_name, 'cliente'),
        'ticket',
        'normal',
        '/admin/communication',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'sender_name', NEW.sender_name)
      FROM public.profiles p
      WHERE p.role = 'admin' AND p.active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar sobre pagamentos
CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  CASE NEW.status
    WHEN 'completed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Pagamento Confirmado',
        'O pagamento da cotação #' || NEW.quote_id || ' foi confirmado',
        'payment',
        'normal',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
    WHEN 'failed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Falha no Pagamento',
        'O pagamento da cotação #' || NEW.quote_id || ' falhou. Verifique os dados e tente novamente',
        'error',
        'high',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Criar os triggers
DROP TRIGGER IF EXISTS trg_notify_new_quote ON public.quotes;
CREATE TRIGGER trg_notify_new_quote
  AFTER INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_quote();

DROP TRIGGER IF EXISTS trg_notify_quote_status_change ON public.quotes;
CREATE TRIGGER trg_notify_quote_status_change
  AFTER UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_quote_status_change();

DROP TRIGGER IF EXISTS trg_notify_new_quote_response ON public.quote_responses;
CREATE TRIGGER trg_notify_new_quote_response
  AFTER INSERT ON public.quote_responses
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_quote_response();

DROP TRIGGER IF EXISTS trg_notify_approval_status ON public.approvals;
CREATE TRIGGER trg_notify_approval_status
  AFTER UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.notify_approval_status();

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();

DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_message();

DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.payments;
CREATE TRIGGER trg_notify_payment_status
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status();

-- Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;