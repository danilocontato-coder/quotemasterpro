-- Função para notificar clientes sobre mudanças de status de entrega
CREATE OR REPLACE FUNCTION public.notify_client_delivery_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_title TEXT;
  status_message TEXT;
  notification_priority TEXT;
  notification_type TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determinar título, mensagem e prioridade baseado no status
  CASE NEW.status
    WHEN 'pending' THEN
      status_title := 'Entrega Agendada';
      status_message := 'A entrega #' || NEW.local_code || ' foi agendada';
      notification_priority := 'normal';
      notification_type := 'delivery';
    WHEN 'in_transit' THEN
      status_title := 'Entrega Iniciada';
      status_message := 'O fornecedor iniciou a entrega #' || NEW.local_code;
      notification_priority := 'normal';
      notification_type := 'delivery';
    WHEN 'delivered' THEN
      status_title := 'Entrega Concluída';
      status_message := 'A entrega #' || NEW.local_code || ' foi realizada com sucesso';
      notification_priority := 'high';
      notification_type := 'delivery';
    WHEN 'cancelled' THEN
      status_title := 'Entrega Cancelada';
      status_message := 'A entrega #' || NEW.local_code || ' foi cancelada';
      notification_priority := 'high';
      notification_type := 'delivery';
    WHEN 'returned' THEN
      status_title := 'Entrega Devolvida';
      status_message := 'A entrega #' || NEW.local_code || ' foi devolvida ao remetente';
      notification_priority := 'high';
      notification_type := 'delivery';
    ELSE
      -- Para outros status, não notificar
      RETURN NEW;
  END CASE;

  -- Notificar todos os usuários do cliente
  PERFORM public.notify_client_users(
    NEW.client_id,
    status_title,
    status_message,
    notification_type,
    notification_priority,
    '/deliveries',
    jsonb_build_object(
      'delivery_id', NEW.id,
      'quote_id', NEW.quote_id,
      'supplier_id', NEW.supplier_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'local_code', NEW.local_code,
      'tracking_code', NEW.tracking_code
    )
  );

  -- Registrar em audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    panel_type,
    details
  ) VALUES (
    auth.uid(),
    'DELIVERY_STATUS_CHANGED',
    'deliveries',
    NEW.id::text,
    'supplier',
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'local_code', NEW.local_code,
      'client_id', NEW.client_id,
      'supplier_id', NEW.supplier_id
    )
  );

  RETURN NEW;
END;
$$;

-- Criar trigger para mudanças de status
DROP TRIGGER IF EXISTS trg_notify_client_delivery_status_change ON public.deliveries;
CREATE TRIGGER trg_notify_client_delivery_status_change
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_delivery_status_change();