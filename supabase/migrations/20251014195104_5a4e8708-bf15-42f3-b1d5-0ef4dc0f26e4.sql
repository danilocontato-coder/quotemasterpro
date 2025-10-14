-- ============================================================
-- FASE 2: TRIGGERS E FUNÇÕES PARA NOTIFICAÇÕES DE FORNECEDORES
-- ============================================================

-- 2.1 - Notificar fornecedor quando cliente envia mensagem
CREATE OR REPLACE FUNCTION public.notify_supplier_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_supplier_id UUID;
  supplier_user_ids UUID[];
BEGIN
  -- Buscar supplier_id da cotação
  SELECT supplier_id INTO quote_supplier_id
  FROM public.quotes
  WHERE id = NEW.quote_id
  LIMIT 1;
  
  -- Se não há supplier_id na quote, buscar de quote_suppliers
  IF quote_supplier_id IS NULL THEN
    SELECT qs.supplier_id INTO quote_supplier_id
    FROM public.quote_suppliers qs
    WHERE qs.quote_id = NEW.quote_id AND qs.conversation_id = NEW.conversation_id
    LIMIT 1;
  END IF;
  
  -- Se ainda não encontrou, não criar notificação
  IF quote_supplier_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar todos os usuários do fornecedor
  SELECT ARRAY_AGG(id) INTO supplier_user_ids
  FROM public.profiles
  WHERE supplier_id = quote_supplier_id AND active = true;
  
  -- Criar notificações para cada usuário do fornecedor
  IF array_length(supplier_user_ids, 1) > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
    SELECT 
      user_id,
      '💬 Nova Mensagem do Cliente',
      'O cliente enviou uma mensagem sobre a cotação.',
      'info',
      'normal',
      '/supplier/quotes',
      jsonb_build_object('quote_id', NEW.quote_id, 'conversation_id', NEW.conversation_id)
    FROM unnest(supplier_user_ids) AS user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_on_message ON public.quote_messages;
CREATE TRIGGER trg_notify_supplier_on_message
  AFTER INSERT ON public.quote_messages
  FOR EACH ROW
  WHEN (NEW.sender_type = 'client')
  EXECUTE FUNCTION public.notify_supplier_on_message();

-- 2.2 - Função para verificar deadlines próximos (chamada por cron job)
CREATE OR REPLACE FUNCTION public.check_quote_deadlines_for_suppliers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  supplier_user_ids UUID[];
BEGIN
  -- Buscar cotações com deadline em 24 horas e ainda sem resposta do fornecedor
  FOR quote_record IN 
    SELECT DISTINCT
      q.id,
      q.title,
      q.deadline,
      qs.supplier_id
    FROM public.quotes q
    JOIN public.quote_suppliers qs ON qs.quote_id = q.id
    WHERE q.deadline IS NOT NULL
      AND q.deadline BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
      AND q.status IN ('sent', 'receiving')
      AND NOT EXISTS (
        SELECT 1 FROM public.quote_responses qr 
        WHERE qr.quote_id = q.id AND qr.supplier_id = qs.supplier_id
      )
  LOOP
    -- Buscar usuários do fornecedor
    SELECT ARRAY_AGG(id) INTO supplier_user_ids
    FROM public.profiles
    WHERE supplier_id = quote_record.supplier_id AND active = true;
    
    -- Criar notificações
    IF array_length(supplier_user_ids, 1) > 0 THEN
      INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
      SELECT 
        user_id,
        '⏰ Prazo Próximo!',
        format('A cotação "%s" vence em menos de 24 horas!', quote_record.title),
        'warning',
        'high',
        '/supplier/quotes',
        jsonb_build_object('quote_id', quote_record.id, 'deadline', quote_record.deadline)
      FROM unnest(supplier_user_ids) AS user_id;
    END IF;
  END LOOP;
END;
$$;

-- 2.3 - Notificar fornecedor quando pagamento é liberado do escrow
CREATE OR REPLACE FUNCTION public.notify_supplier_payment_released()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supplier_user_ids UUID[];
  quote_info RECORD;
BEGIN
  -- Só notificar quando status mudar de 'in_escrow' para 'released'
  IF OLD.status = 'in_escrow' AND NEW.status = 'released' THEN
    
    -- Buscar informações da cotação
    SELECT id, title INTO quote_info
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    -- Buscar usuários do fornecedor
    SELECT ARRAY_AGG(id) INTO supplier_user_ids
    FROM public.profiles
    WHERE supplier_id = NEW.supplier_id AND active = true;
    
    -- Criar notificações
    IF array_length(supplier_user_ids, 1) > 0 THEN
      INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
      SELECT 
        user_id,
        '💰 Pagamento Liberado!',
        format('O pagamento de R$ %.2f foi liberado para sua conta.', NEW.amount),
        'success',
        'high',
        '/supplier/payments',
        jsonb_build_object(
          'payment_id', NEW.id,
          'quote_id', quote_info.id,
          'amount', NEW.amount
        )
      FROM unnest(supplier_user_ids) AS user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_payment_released ON public.payments;
CREATE TRIGGER trg_notify_supplier_payment_released
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_payment_released();

-- 2.4 - Notificar fornecedor quando cliente confirma entrega
CREATE OR REPLACE FUNCTION public.notify_supplier_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supplier_user_ids UUID[];
BEGIN
  -- Só notificar quando status mudar para 'confirmed'
  IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    
    -- Buscar usuários do fornecedor
    SELECT ARRAY_AGG(id) INTO supplier_user_ids
    FROM public.profiles
    WHERE supplier_id = NEW.supplier_id AND active = true;
    
    -- Criar notificações
    IF array_length(supplier_user_ids, 1) > 0 THEN
      INSERT INTO public.notifications (user_id, title, message, type, priority, action_url, metadata)
      SELECT 
        user_id,
        '✅ Entrega Confirmada!',
        'O cliente confirmou o recebimento da entrega.',
        'success',
        'normal',
        '/supplier/deliveries',
        jsonb_build_object(
          'delivery_id', NEW.id,
          'quote_id', NEW.quote_id,
          'confirmed_at', NEW.confirmed_at
        )
      FROM unnest(supplier_user_ids) AS user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_delivery_confirmed ON public.deliveries;
CREATE TRIGGER trg_notify_supplier_delivery_confirmed
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_delivery_confirmed();