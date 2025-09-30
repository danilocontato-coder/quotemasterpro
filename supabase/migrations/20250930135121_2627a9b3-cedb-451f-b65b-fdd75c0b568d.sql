-- ============================================================================
-- DATABASE FUNCTION SECURITY HARDENING - Phase 2
-- Add SET search_path = public to all remaining security definer functions
-- ============================================================================

-- Fix: reset_monthly_usage
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.client_usage 
  SET 
    quotes_this_month = 0,
    quote_responses_this_month = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE last_reset_date < date_trunc('month', CURRENT_DATE);
END;
$function$;

-- Fix: increment_quote_usage
CREATE OR REPLACE FUNCTION public.increment_quote_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.client_usage (client_id, quotes_this_month, updated_at)
  VALUES (NEW.client_id, 1, now())
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    quotes_this_month = client_usage.quotes_this_month + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Fix: create_rating_prompt_after_payment
CREATE OR REPLACE FUNCTION public.create_rating_prompt_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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
      'Avalie a qualidade do serviço prestado pelo fornecedor na cotação #' || NEW.quote_id,
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

-- Fix: update_supplier_average_rating
CREATE OR REPLACE FUNCTION public.update_supplier_average_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_avg_rating NUMERIC;
BEGIN
  SELECT ROUND(AVG(rating), 2) INTO new_avg_rating
  FROM public.supplier_ratings
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  UPDATE public.suppliers
  SET rating = COALESCE(new_avg_rating, 0),
      updated_at = now()
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix: increment_coupon_usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.coupons 
  SET usage_count = usage_count + 1
  WHERE id = NEW.coupon_id;
  
  RETURN NEW;
END;
$function$;

-- Fix: notify_supplier_rating
CREATE OR REPLACE FUNCTION public.notify_supplier_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  supplier_users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO supplier_users_count
  FROM public.profiles
  WHERE supplier_id = NEW.supplier_id;
  
  IF supplier_users_count > 0 THEN
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
      'Nova Avaliação Recebida',
      'Você recebeu uma nova avaliação do cliente. Nota: ' || NEW.rating || '/5 ⭐',
      'rating_received',
      'normal',
      jsonb_build_object(
        'rating_id', NEW.id,
        'rating', NEW.rating,
        'quote_id', NEW.quote_id,
        'client_name', COALESCE(c.name, 'Cliente')
      )
    FROM public.profiles p
    LEFT JOIN public.clients c ON c.id = NEW.client_id
    WHERE p.supplier_id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix: create_delivery_on_escrow
CREATE OR REPLACE FUNCTION public.create_delivery_on_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.status != 'in_escrow' AND NEW.status = 'in_escrow' THEN
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
      'Pagamento confirmado para cotação #' || NEW.quote_id || '. Organize a entrega.',
      'delivery',
      'high',
      jsonb_build_object('payment_id', NEW.id, 'quote_id', NEW.quote_id)
    FROM public.profiles p
    WHERE p.supplier_id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix: create_delivery_confirmation_code
CREATE OR REPLACE FUNCTION public.create_delivery_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
    INSERT INTO public.delivery_confirmations (
      delivery_id,
      confirmation_code
    ) VALUES (
      NEW.id,
      public.generate_delivery_code()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix: create_automatic_payment
CREATE OR REPLACE FUNCTION public.create_automatic_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.payments WHERE quote_id = NEW.id
    ) THEN
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
$function$;