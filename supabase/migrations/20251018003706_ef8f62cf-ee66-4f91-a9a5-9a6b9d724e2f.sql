-- Modificar trigger para enviar códigos automaticamente via múltiplos canais
CREATE OR REPLACE FUNCTION public.create_delivery_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_code TEXT;
  client_user_ids UUID[];
  client_info RECORD;
BEGIN
  -- Só criar código quando status muda para 'scheduled'
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
    -- Gerar código único
    new_code := public.generate_delivery_code();
    
    -- Inserir código
    INSERT INTO public.delivery_confirmations (
      delivery_id,
      confirmation_code
    ) VALUES (
      NEW.id,
      new_code
    );
    
    -- Buscar informações do cliente
    SELECT c.name, c.email, c.phone, c.whatsapp
    INTO client_info
    FROM clients_condos c
    WHERE c.id = NEW.client_id;
    
    -- Buscar IDs dos usuários do cliente
    SELECT array_agg(p.id)
    INTO client_user_ids
    FROM profiles p
    WHERE p.client_id = NEW.client_id
      AND p.active = true;
    
    -- ENVIO 1: Notificação in-app
    IF client_user_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, priority, metadata)
      SELECT 
        unnest(client_user_ids),
        'Entrega Agendada - Código Disponível',
        format('Sua entrega foi agendada. Código de confirmação: %s. Use-o para confirmar o recebimento.', new_code),
        'delivery_code_generated',
        'high',
        jsonb_build_object(
          'delivery_id', NEW.id,
          'quote_id', NEW.quote_id,
          'confirmation_code', new_code,
          'action_url', '/client/deliveries'
        );
    END IF;
    
    -- ENVIO 2: WhatsApp (via edge function) - usar phone ou whatsapp
    IF COALESCE(client_info.whatsapp, client_info.phone) IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := current_setting('app.supabase_url', true) || '/functions/v1/send-delivery-code-whatsapp',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
          ),
          body := jsonb_build_object(
            'phone', COALESCE(client_info.whatsapp, client_info.phone),
            'client_name', client_info.name,
            'confirmation_code', new_code,
            'delivery_id', NEW.id,
            'quote_id', NEW.quote_id
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log erro mas não falhar a operação principal
          RAISE WARNING 'Falha ao enviar WhatsApp: %', SQLERRM;
      END;
    END IF;
    
    -- ENVIO 3: Email (via edge function)
    IF client_info.email IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := current_setting('app.supabase_url', true) || '/functions/v1/send-delivery-code-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
          ),
          body := jsonb_build_object(
            'email', client_info.email,
            'client_name', client_info.name,
            'confirmation_code', new_code,
            'delivery_id', NEW.id,
            'quote_id', NEW.quote_id
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log erro mas não falhar a operação principal
          RAISE WARNING 'Falha ao enviar Email: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;