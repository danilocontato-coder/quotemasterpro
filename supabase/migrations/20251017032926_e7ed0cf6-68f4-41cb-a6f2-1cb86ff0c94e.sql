-- Corrigir função create_delivery_on_escrow para garantir delivery_address válido
CREATE OR REPLACE FUNCTION public.create_delivery_on_escrow()
RETURNS TRIGGER AS $$
DECLARE
  quote_local_code TEXT;
  delivery_address_text TEXT;
  client_address JSONB;
BEGIN
  IF OLD.status != 'in_escrow' AND NEW.status = 'in_escrow' THEN
    -- Buscar local_code da cotação
    SELECT local_code INTO quote_local_code
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    -- Buscar endereço do cliente (JSONB)
    SELECT address INTO client_address
    FROM public.clients
    WHERE id = NEW.client_id
    LIMIT 1;
    
    -- Converter JSONB para texto legível ou usar fallback
    IF client_address IS NOT NULL THEN
      delivery_address_text := CONCAT_WS(', ',
        client_address->>'street',
        client_address->>'number',
        client_address->>'complement',
        client_address->>'neighborhood',
        client_address->>'city',
        client_address->>'state',
        client_address->>'zipCode'
      );
      -- Remover vírgulas extras de campos vazios
      delivery_address_text := REGEXP_REPLACE(delivery_address_text, ',\s*,', ',', 'g');
      delivery_address_text := TRIM(BOTH ', ' FROM delivery_address_text);
    END IF;
    
    -- Se ainda estiver vazio, usar fallback
    IF delivery_address_text IS NULL OR delivery_address_text = '' THEN
      delivery_address_text := 'Endereço não informado pelo cliente';
    END IF;
    
    -- Inserir entrega
    INSERT INTO public.deliveries (
      quote_id,
      payment_id,
      client_id,
      supplier_id,
      delivery_address,
      scheduled_date,
      status
    ) VALUES (
      NEW.quote_id,
      NEW.id,
      NEW.client_id,
      NEW.supplier_id,
      delivery_address_text,
      NOW() + INTERVAL '3 days',
      'pending'
    );
    
    -- Notificar fornecedor
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
      'Nova Entrega para Organizar',
      'Pagamento confirmado para cotação ' || quote_local_code || '. Organize a entrega.',
      'delivery',
      'high',
      jsonb_build_object(
        'quote_id', NEW.quote_id,
        'payment_id', NEW.id,
        'delivery_address', delivery_address_text
      )
    FROM public.profiles p
    WHERE p.supplier_id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;