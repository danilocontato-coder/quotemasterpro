-- Atualizar triggers para usar local_code em notificações

-- =============================================
-- 1. notify_new_quote_response
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_new_quote_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
BEGIN
  -- Buscar informações da cotação incluindo local_code
  SELECT q.*, q.local_code INTO quote_record
  FROM public.quotes q
  WHERE q.id = NEW.quote_id;
  
  IF quote_record IS NOT NULL THEN
    -- Notificar usuários do cliente
    PERFORM public.notify_client_users(
      quote_record.client_id,
      'Nova Proposta Recebida',
      'O fornecedor ' || NEW.supplier_name || ' enviou uma proposta para a cotação #' || COALESCE(quote_record.local_code, NEW.quote_id),
      'proposal',
      'normal',
      '/quotes',
      jsonb_build_object('quote_id', NEW.quote_id, 'supplier_name', NEW.supplier_name, 'amount', NEW.total_amount)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 2. notify_approval_status
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
  approver_name TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar informações da cotação e aprovador incluindo local_code
  SELECT q.*, q.local_code, p.name as approver_name 
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
          'A cotação #' || COALESCE(quote_record.local_code, NEW.quote_id) || ' foi aprovada por ' || COALESCE(quote_record.approver_name, 'um aprovador'),
          'success',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'approver', quote_record.approver_name)
        );
      WHEN 'rejected' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Cotação Rejeitada',
          'A cotação #' || COALESCE(quote_record.local_code, NEW.quote_id) || ' foi rejeitada por ' || COALESCE(quote_record.approver_name, 'um aprovador'),
          'warning',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'approver', quote_record.approver_name, 'comments', NEW.comments)
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 3. notify_payment_status
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_local_code TEXT;
BEGIN
  -- Só notificar se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar local_code da cotação
  SELECT local_code INTO quote_local_code
  FROM public.quotes
  WHERE id = NEW.quote_id;
  
  CASE NEW.status
    WHEN 'completed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Pagamento Confirmado',
        'O pagamento da cotação #' || COALESCE(quote_local_code, NEW.quote_id) || ' foi confirmado',
        'payment',
        'normal',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
    WHEN 'failed' THEN
      PERFORM public.notify_client_users(
        NEW.client_id,
        'Falha no Pagamento',
        'O pagamento da cotação #' || COALESCE(quote_local_code, NEW.quote_id) || ' falhou. Verifique os dados e tente novamente',
        'error',
        'high',
        '/payments',
        jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id, 'amount', NEW.amount)
      );
  END CASE;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 4. notify_negotiation_status
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_negotiation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
BEGIN
  -- Buscar informações da cotação incluindo local_code
  SELECT q.*, q.local_code INTO quote_record
  FROM public.quotes q
  WHERE q.id = NEW.quote_id;
  
  IF quote_record IS NOT NULL THEN
    CASE NEW.status
      WHEN 'completed' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Negociação IA Concluída',
          'A IA finalizou a negociação da cotação #' || COALESCE(quote_record.local_code, NEW.quote_id) || '. Desconto obtido: ' || COALESCE(NEW.discount_percentage, 0) || '%',
          'success',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'negotiation_id', NEW.id, 'discount', NEW.discount_percentage)
        );
      WHEN 'failed' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Negociação IA Falhou',
          'A IA não conseguiu negociar a cotação #' || COALESCE(quote_record.local_code, NEW.quote_id) || '. Revisão manual necessária.',
          'warning',
          'normal',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'negotiation_id', NEW.id)
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 5. create_rating_prompt_after_payment
-- =============================================
CREATE OR REPLACE FUNCTION public.create_rating_prompt_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_local_code TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Buscar local_code
    SELECT local_code INTO quote_local_code
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
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
      'Avalie seu Fornecedor',
      'Avalie a qualidade do serviço prestado pelo fornecedor na cotação #' || COALESCE(quote_local_code, NEW.quote_id),
      'rating_prompt',
      'normal',
      '/quotes',
      jsonb_build_object(
        'type', 'rating_prompt',
        'payment_id', NEW.id,
        'quote_id', NEW.quote_id,
        'supplier_id', NEW.supplier_id,
        'supplier_name', COALESCE(s.name, 'Fornecedor')
      )
    FROM public.profiles p
    LEFT JOIN public.suppliers s ON s.id = NEW.supplier_id
    WHERE p.client_id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 6. create_delivery_on_escrow
-- =============================================
CREATE OR REPLACE FUNCTION public.create_delivery_on_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_local_code TEXT;
BEGIN
  IF OLD.status != 'in_escrow' AND NEW.status = 'in_escrow' THEN
    -- Buscar local_code
    SELECT local_code INTO quote_local_code
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    INSERT INTO public.deliveries (
      payment_id,
      quote_id,
      client_id,
      supplier_id,
      status
    ) VALUES (
      NEW.id,
      NEW.quote_id,
      NEW.client_id,
      NEW.supplier_id,
      'pending'
    );
    
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      priority,
      metadata
    )
    SELECT 
      p.id,
      'Nova Entrega Agendada',
      'Pagamento confirmado para cotação #' || COALESCE(quote_local_code, NEW.quote_id) || '. Organize a entrega.',
      'delivery',
      'high',
      jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id)
    FROM public.profiles p
    WHERE p.supplier_id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$function$;