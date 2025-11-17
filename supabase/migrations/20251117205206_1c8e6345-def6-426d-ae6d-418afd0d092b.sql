-- =====================================================
-- FASE 1: Trigger Placeholder de Entrega em Custódia
-- =====================================================

-- Tornar scheduled_date nullable para permitir placeholders
ALTER TABLE public.deliveries 
ALTER COLUMN scheduled_date DROP NOT NULL;

-- Criar índice único para garantir idempotência (1 delivery por quote+supplier)
CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_quote_supplier 
ON public.deliveries(quote_id, supplier_id);

-- Função para criar delivery placeholder quando pagamento entra em custódia
CREATE OR REPLACE FUNCTION public.create_placeholder_delivery_on_escrow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_delivery_id UUID;
BEGIN
  -- Apenas criar placeholder quando pagamento muda PARA in_escrow
  IF NEW.status = 'in_escrow' AND OLD.status <> 'in_escrow' THEN
    
    -- Buscar client_id da cotação
    SELECT client_id INTO v_client_id
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    -- Inserir delivery placeholder se não existir (idempotente graças ao índice único)
    INSERT INTO public.deliveries (
      quote_id,
      supplier_id,
      client_id,
      payment_id,
      status,
      scheduled_date,
      delivery_address,
      notes
    )
    VALUES (
      NEW.quote_id,
      NEW.supplier_id,
      v_client_id,
      NEW.id,
      'pending',
      NULL,
      '',
      'placeholder_auto_on_escrow'
    )
    ON CONFLICT (quote_id, supplier_id) DO NOTHING
    RETURNING id INTO v_delivery_id;
    
    -- Registrar em audit_logs apenas se delivery foi criada
    IF v_delivery_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        panel_type,
        details
      )
      VALUES (
        NULL,
        'DELIVERY_PLACEHOLDER_CREATED',
        'deliveries',
        v_delivery_id::text,
        'system',
        jsonb_build_object(
          'quote_id', NEW.quote_id,
          'supplier_id', NEW.supplier_id,
          'payment_id', NEW.id,
          'trigger', 'auto_on_escrow'
        )
      );
      
      RAISE LOG 'Placeholder delivery created: delivery_id=%, quote_id=%, supplier_id=%', 
        v_delivery_id, NEW.quote_id, NEW.supplier_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger AFTER UPDATE em payments
DROP TRIGGER IF EXISTS trg_create_placeholder_delivery_on_escrow ON public.payments;

CREATE TRIGGER trg_create_placeholder_delivery_on_escrow
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.create_placeholder_delivery_on_escrow();

-- =====================================================
-- BACKFILL: Criar placeholders para pagamentos já em custódia
-- =====================================================

INSERT INTO public.deliveries (
  quote_id,
  supplier_id,
  client_id,
  payment_id,
  status,
  scheduled_date,
  delivery_address,
  notes
)
SELECT 
  p.quote_id,
  p.supplier_id,
  q.client_id,
  p.id,
  'pending',
  NULL,
  '',
  'placeholder_backfill'
FROM public.payments p
JOIN public.quotes q ON q.id = p.quote_id
WHERE p.status = 'in_escrow'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.deliveries d 
    WHERE d.quote_id = p.quote_id 
      AND d.supplier_id = p.supplier_id
  )
ON CONFLICT (quote_id, supplier_id) DO NOTHING;

-- Log do backfill
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfill completed: % placeholder deliveries created', v_count;
END $$;