-- Corrigir fluxo de pagamento offline para ir direto para 'completed'

-- 1. Atualizar função approve_offline_payment
CREATE OR REPLACE FUNCTION public.approve_offline_payment(p_payment_id text, p_approved boolean, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_supplier_id uuid;
  v_new_status text;
  v_action_type text;
BEGIN
  -- Obter supplier_id do usuário atual
  v_supplier_id := get_current_user_supplier_id();
  
  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não é um fornecedor válido'
    );
  END IF;

  -- Buscar pagamento e validar ownership
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
    AND supplier_id = v_supplier_id
    AND status = 'manual_confirmation';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pagamento não encontrado ou não está aguardando confirmação'
    );
  END IF;

  -- Definir novo status e action
  IF p_approved THEN
    v_new_status := 'completed'; -- MUDANÇA: direto para completed ao invés de in_escrow
    v_action_type := 'OFFLINE_PAYMENT_APPROVED';
  ELSE
    v_new_status := 'pending';
    v_action_type := 'OFFLINE_PAYMENT_REJECTED';
  END IF;

  -- Atualizar pagamento
  IF p_approved THEN
    UPDATE payments
    SET 
      status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_notes,
      updated_at = now()
    WHERE id = p_payment_id;
  ELSE
    -- Rejeição: limpar dados offline e voltar para pending
    UPDATE payments
    SET 
      status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_notes,
      offline_notes = NULL,
      offline_attachments = NULL,
      updated_at = now()
    WHERE id = p_payment_id;
  END IF;

  -- Registrar auditoria
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    panel_type,
    details
  ) VALUES (
    auth.uid(),
    v_action_type,
    'payments',
    p_payment_id,
    'supplier',
    jsonb_build_object(
      'approved', p_approved,
      'notes', p_notes,
      'previous_status', v_payment.status,
      'new_status', v_new_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'message', CASE 
      WHEN p_approved THEN 'Pagamento confirmado com sucesso'
      ELSE 'Pagamento rejeitado'
    END
  );
END;
$function$;

-- 2. Atualizar trigger para criar entrega tanto em in_escrow quanto completed
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
  -- Executar quando status mudar para in_escrow (online) OU completed (offline)
  IF OLD.status != NEW.status AND NEW.status IN ('in_escrow', 'completed') THEN
    
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
    
    -- Criar registro de entrega com scheduled_date
    INSERT INTO public.deliveries (
      client_id,
      supplier_id,
      quote_id,
      delivery_address,
      scheduled_date,
      status,
      created_at
    ) VALUES (
      NEW.client_id,
      NEW.supplier_id,
      NEW.quote_id,
      delivery_address_text,
      NOW() + INTERVAL '3 days',
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

-- 3. Atualizar policy RLS para permitir fornecedor atualizar para completed
DROP POLICY IF EXISTS payments_supplier_confirm_offline ON public.payments;

CREATE POLICY payments_supplier_confirm_offline ON public.payments
FOR UPDATE
TO authenticated
USING (
  supplier_id = get_current_user_supplier_id()
  AND status = 'manual_confirmation'
)
WITH CHECK (
  supplier_id = get_current_user_supplier_id()
  AND status IN ('completed', 'pending')
);