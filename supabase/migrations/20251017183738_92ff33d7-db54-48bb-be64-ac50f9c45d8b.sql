-- Atualizar função create_delivery_on_escrow para aceitar address em JSON ou texto
CREATE OR REPLACE FUNCTION public.create_delivery_on_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  addr_text TEXT;
  addr_json JSONB;
  delivery_address_text TEXT;
  v_delivery_id UUID;
BEGIN
  -- Só executar quando status mudar para in_escrow
  IF OLD.status != 'in_escrow' AND NEW.status = 'in_escrow' THEN
    
    -- Buscar endereço do cliente como texto
    SELECT c.address::text INTO addr_text 
    FROM public.clients c 
    WHERE c.id = NEW.client_id;
    
    -- Tentar converter para JSONB de forma segura
    BEGIN
      addr_json := addr_text::jsonb;
    EXCEPTION 
      WHEN others THEN
        addr_json := NULL;
    END;
    
    -- Construir endereço de entrega
    IF addr_json IS NOT NULL THEN
      -- Se é JSON válido, formatar campos
      delivery_address_text := CONCAT_WS(', ',
        addr_json->>'street',
        addr_json->>'number',
        addr_json->>'complement',
        addr_json->>'neighborhood',
        addr_json->>'city',
        addr_json->>'state',
        addr_json->>'zipCode'
      );
      
      -- Limpar vírgulas duplicadas e espaços
      delivery_address_text := REGEXP_REPLACE(delivery_address_text, ',\s*,', ',', 'g');
      delivery_address_text := TRIM(BOTH ', ' FROM delivery_address_text);
    ELSIF addr_text IS NOT NULL AND TRIM(addr_text) != '' THEN
      -- Se não é JSON mas tem texto, usar texto direto
      delivery_address_text := TRIM(addr_text);
    ELSE
      -- Fallback se não tiver endereço
      delivery_address_text := 'Endereço não informado pelo cliente';
    END IF;
    
    -- Criar registro de entrega
    INSERT INTO public.deliveries (
      client_id,
      supplier_id,
      quote_id,
      delivery_address,
      status,
      created_at
    ) VALUES (
      NEW.client_id,
      NEW.supplier_id,
      NEW.quote_id,
      delivery_address_text,
      'pending',
      now()
    )
    RETURNING id INTO v_delivery_id;
    
    -- Notificar cliente sobre criação da entrega
    PERFORM public.notify_client_users(
      NEW.client_id,
      'Entrega Criada',
      'Uma entrega foi criada automaticamente após confirmação do pagamento',
      'delivery',
      'normal',
      '/deliveries',
      jsonb_build_object(
        'delivery_id', v_delivery_id,
        'quote_id', NEW.quote_id,
        'payment_id', NEW.id
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;