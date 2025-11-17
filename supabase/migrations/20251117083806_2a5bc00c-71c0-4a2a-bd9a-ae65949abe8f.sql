-- FASE 1: Adicionar coluna supplier_id na tabela notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_supplier_id ON notifications(supplier_id);

COMMENT ON COLUMN notifications.supplier_id IS 'ID do fornecedor para broadcast de notificações';

-- FASE 2: Criar função notify_supplier_users
CREATE OR REPLACE FUNCTION public.notify_supplier_users(
  p_supplier_id UUID,
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
    supplier_id,
    title,
    message,
    type,
    priority,
    action_url,
    metadata
  )
  SELECT 
    p.id,
    p_supplier_id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_action_url,
    p_metadata
  FROM public.profiles p
  WHERE p.supplier_id = p_supplier_id 
    AND p.active = true;
END;
$$;

COMMENT ON FUNCTION notify_supplier_users IS 'Notifica todos os usuários ativos de um fornecedor';

-- FASE 5.1: Notificar quando fornecedor recebe nova cotação
CREATE OR REPLACE FUNCTION public.notify_supplier_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_info RECORD;
BEGIN
  -- Buscar informações da cotação
  SELECT id, local_code, title, deadline 
  INTO quote_info
  FROM public.quotes
  WHERE id = NEW.quote_id;
  
  -- Notificar fornecedor
  PERFORM public.notify_supplier_users(
    NEW.supplier_id,
    '📋 Nova Cotação Recebida',
    format('Você recebeu uma nova cotação: %s. Prazo: %s', 
      quote_info.title, 
      to_char(quote_info.deadline, 'DD/MM/YYYY')
    ),
    'quote',
    'high',
    '/supplier/quotes',
    jsonb_build_object(
      'quote_id', quote_info.id,
      'local_code', quote_info.local_code,
      'deadline', quote_info.deadline
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_new_quote ON public.quote_suppliers;
CREATE TRIGGER trg_notify_supplier_new_quote
  AFTER INSERT ON public.quote_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_new_quote();

-- FASE 5.2: Notificar quando proposta é aprovada/rejeitada
CREATE OR REPLACE FUNCTION public.notify_supplier_proposal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_info RECORD;
  status_msg TEXT;
  notification_type TEXT;
BEGIN
  -- Só notificar se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se é aprovação ou rejeição
  IF NEW.status IN ('approved', 'selected') THEN
    status_msg := '✅ Sua proposta foi aprovada!';
    notification_type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    status_msg := '❌ Sua proposta não foi selecionada.';
    notification_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Buscar info da cotação
  SELECT id, local_code, title 
  INTO quote_info
  FROM public.quotes
  WHERE id = NEW.quote_id;
  
  -- Notificar fornecedor
  PERFORM public.notify_supplier_users(
    NEW.supplier_id,
    status_msg,
    format('Cotação: %s', quote_info.title),
    notification_type,
    'high',
    '/supplier/quotes',
    jsonb_build_object(
      'quote_id', quote_info.id,
      'local_code', quote_info.local_code,
      'response_id', NEW.id,
      'status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_proposal_status ON public.quote_responses;
CREATE TRIGGER trg_notify_supplier_proposal_status
  AFTER UPDATE ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_proposal_status();

-- FASE 5.3: Notificar quando pagamento entra em escrow
CREATE OR REPLACE FUNCTION public.notify_supplier_payment_in_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_info RECORD;
  supplier_id_var UUID;
BEGIN
  -- Só notificar quando pagamento for para escrow
  IF NEW.status = 'in_escrow' AND (OLD.status IS NULL OR OLD.status != 'in_escrow') THEN
    
    -- Buscar info da cotação e supplier_id da proposta aprovada
    SELECT q.id, q.local_code, q.title, qr.supplier_id
    INTO quote_info
    FROM public.quotes q
    LEFT JOIN public.quote_responses qr ON qr.quote_id = q.id AND qr.status IN ('approved', 'selected')
    WHERE q.id = NEW.quote_id
    LIMIT 1;
    
    -- Se encontrou supplier_id, notificar
    IF quote_info.supplier_id IS NOT NULL THEN
      PERFORM public.notify_supplier_users(
        quote_info.supplier_id,
        '💰 Pagamento Confirmado!',
        format('O pagamento de R$ %.2f foi confirmado e está em custódia. Agende a entrega!', NEW.amount),
        'payment',
        'high',
        '/supplier/deliveries',
        jsonb_build_object(
          'payment_id', NEW.id,
          'quote_id', quote_info.id,
          'local_code', quote_info.local_code,
          'amount', NEW.amount,
          'action', 'schedule_delivery'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_payment_in_escrow ON public.payments;
CREATE TRIGGER trg_notify_supplier_payment_in_escrow
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_payment_in_escrow();

-- FASE 5.4: Função para verificar deadlines (cron job)
CREATE OR REPLACE FUNCTION public.check_supplier_quote_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiring_quote RECORD;
BEGIN
  -- Buscar cotações que expiram em 24 horas e ainda não têm proposta
  FOR expiring_quote IN
    SELECT 
      q.id,
      q.local_code,
      q.title,
      q.deadline,
      qs.supplier_id
    FROM quote_suppliers qs
    JOIN quotes q ON q.id = qs.quote_id
    LEFT JOIN quote_responses qr ON qr.quote_id = q.id AND qr.supplier_id = qs.supplier_id
    WHERE q.deadline > now()
      AND q.deadline < now() + interval '24 hours'
      AND q.status IN ('sent', 'receiving')
      AND qr.id IS NULL
  LOOP
    PERFORM notify_supplier_users(
      expiring_quote.supplier_id,
      '⏰ Cotação Expirando em Breve!',
      format('A cotação "%s" expira em menos de 24 horas. Responda agora!', expiring_quote.title),
      'warning',
      'high',
      '/supplier/quotes',
      jsonb_build_object(
        'quote_id', expiring_quote.id,
        'local_code', expiring_quote.local_code,
        'deadline', expiring_quote.deadline
      )
    );
  END LOOP;
END;
$$;