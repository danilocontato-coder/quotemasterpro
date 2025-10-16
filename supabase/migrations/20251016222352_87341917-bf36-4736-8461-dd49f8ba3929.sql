-- Criar função para gerar IDs amigáveis de pagamento (PAY001, PAY002, etc.)
CREATE OR REPLACE FUNCTION public.generate_friendly_payment_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_id TEXT;
BEGIN
  -- Buscar o maior número existente em IDs que começam com PAY
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(id FROM 'PAY(\d+)') AS INTEGER
      )
    ), 
    0
  ) + 1
  INTO next_num
  FROM payments
  WHERE id ~ '^PAY\d+$';
  
  -- Formatar com 3 dígitos (PAY001, PAY002, etc.)
  new_id := 'PAY' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Criar trigger para auto-gerar IDs amigáveis
CREATE OR REPLACE FUNCTION public.trg_payments_generate_friendly_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só gerar ID se estiver vazio, null ou começar com '#'
  IF NEW.id IS NULL OR BTRIM(NEW.id) = '' OR NEW.id LIKE '#PG%' THEN
    NEW.id := public.generate_friendly_payment_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS payment_id_trigger ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_set_id ON public.payments;

-- Criar novo trigger
CREATE TRIGGER trg_payments_friendly_id
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_payments_generate_friendly_id();

-- Comentário explicativo
COMMENT ON FUNCTION public.generate_friendly_payment_id() IS 'Gera IDs amigáveis sequenciais para pagamentos no formato PAY001, PAY002, etc.';