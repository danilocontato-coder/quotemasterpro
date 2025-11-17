-- ========================================
-- CORREÇÃO: Trigger com formato incorreto
-- ========================================
-- O trigger notify_supplier_payment_in_escrow tem um erro no format()
-- PostgreSQL usa to_char() ou CONCAT para formatar números

-- Drop e recriar a função com formato correto
DROP FUNCTION IF EXISTS notify_supplier_payment_in_escrow() CASCADE;

CREATE OR REPLACE FUNCTION notify_supplier_payment_in_escrow()
RETURNS TRIGGER AS $$
DECLARE
  quote_info RECORD;
BEGIN
  -- Apenas quando mudar de pending → in_escrow
  IF OLD.status = 'pending' AND NEW.status = 'in_escrow' THEN
    
    -- Buscar info da cotação
    SELECT id, local_code, supplier_id
    INTO quote_info
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    IF quote_info.supplier_id IS NOT NULL THEN
      -- Notificar fornecedor (usando CONCAT para formatar valor)
      PERFORM public.notify_supplier_users(
        quote_info.supplier_id,
        '💰 Pagamento Confirmado!',
        CONCAT('O pagamento de R$ ', ROUND(NEW.amount::numeric, 2), ' foi confirmado e está em custódia. Agende a entrega!'),
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
      
      RAISE LOG 'Fornecedor % notificado sobre pagamento em escrow: %', quote_info.supplier_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_notify_supplier_payment_in_escrow ON payments;

CREATE TRIGGER trg_notify_supplier_payment_in_escrow
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_supplier_payment_in_escrow();