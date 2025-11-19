-- ================================================================
-- CORREÇÃO DE SEGURANÇA: Adicionar search_path às funções
-- ================================================================

-- Recriar função send_delivery_code_async com search_path
CREATE OR REPLACE FUNCTION send_delivery_code_async()
RETURNS TRIGGER AS $$
DECLARE
  v_client_data RECORD;
  v_quote_id UUID;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Buscar dados do cliente e cotação
  SELECT 
    c.name, 
    c.email, 
    c.phone,
    d.quote_id
  INTO v_client_data
  FROM deliveries d
  JOIN clients c ON c.id = d.client_id
  WHERE d.id = NEW.delivery_id;
  
  v_quote_id := v_client_data.quote_id;
  
  -- Buscar configurações do Supabase (armazenadas no banco)
  SELECT current_setting('app.supabase_url', true) INTO v_supabase_url;
  SELECT current_setting('app.service_role_key', true) INTO v_service_role_key;
  
  -- Se as configurações estiverem disponíveis, enviar via HTTP
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    -- Enviar e-mail (via pg_net se disponível)
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-delivery-code-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'email', v_client_data.email,
        'client_name', v_client_data.name,
        'confirmation_code', NEW.confirmation_code,
        'delivery_id', NEW.delivery_id,
        'quote_id', v_quote_id
      )
    );
    
    -- Enviar WhatsApp se telefone disponível
    IF v_client_data.phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'to', v_client_data.phone,
          'template', 'delivery_code',
          'template_data', jsonb_build_object(
            'client_name', v_client_data.name,
            'confirmation_code', NEW.confirmation_code,
            'delivery_id', NEW.delivery_id,
            'quote_id', v_quote_id
          )
        )
      );
    END IF;
    
    -- Marcar como enviado
    UPDATE delivery_confirmations
    SET 
      code_sent = true,
      sent_at = NOW(),
      sent_channels = jsonb_build_object(
        'email', true,
        'whatsapp', v_client_data.phone IS NOT NULL
      )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar função retry_unsent_delivery_codes com search_path
CREATE OR REPLACE FUNCTION retry_unsent_delivery_codes()
RETURNS TABLE(delivery_id UUID, code_sent BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_unsent RECORD;
BEGIN
  FOR v_unsent IN 
    SELECT dc.* 
    FROM delivery_confirmations dc
    JOIN deliveries d ON d.id = dc.delivery_id
    WHERE dc.code_sent = false 
      AND dc.is_used = false
      AND dc.expires_at > NOW()
      AND d.status = 'scheduled'
      AND dc.created_at > NOW() - INTERVAL '24 hours'
    LIMIT 10
  LOOP
    BEGIN
      -- Tentar reenviar
      PERFORM send_delivery_code_async();
      
      RETURN QUERY SELECT v_unsent.delivery_id, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_unsent.delivery_id, false, SQLERRM;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar função log_delivery_scheduling com search_path
CREATE OR REPLACE FUNCTION log_delivery_scheduling()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
    INSERT INTO audit_logs (
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      'DELIVERY_STATUS_CHANGED_TO_SCHEDULED',
      'deliveries',
      NEW.id,
      'system',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'quote_id', NEW.quote_id,
        'scheduled_date', NEW.scheduled_date,
        'changed_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;