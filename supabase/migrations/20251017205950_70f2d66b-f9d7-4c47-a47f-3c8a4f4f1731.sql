-- Adicionar coluna delivery_id à tabela supplier_ratings
ALTER TABLE public.supplier_ratings 
ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_delivery_id 
ON public.supplier_ratings(delivery_id);

-- Criar trigger para notificação automática após entrega confirmada
CREATE OR REPLACE FUNCTION public.notify_rating_after_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_name TEXT;
BEGIN
  -- Somente quando status mudar para 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Buscar nome do fornecedor
    SELECT name INTO v_supplier_name
    FROM public.suppliers
    WHERE id = NEW.supplier_id;
    
    -- Criar notificação de rating_prompt para usuários do cliente
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
      'Avalie o Fornecedor',
      'Sua entrega foi confirmada. Compartilhe sua experiência com ' || COALESCE(v_supplier_name, 'o fornecedor') || '!',
      'rating_prompt',
      'normal',
      jsonb_build_object(
        'supplier_id', NEW.supplier_id,
        'supplier_name', COALESCE(v_supplier_name, 'Fornecedor'),
        'quote_id', NEW.quote_id,
        'payment_id', NEW.payment_id,
        'delivery_id', NEW.id
      )
    FROM public.profiles p
    WHERE p.client_id = NEW.client_id
      AND p.active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela deliveries
DROP TRIGGER IF EXISTS trg_notify_rating_after_delivery ON public.deliveries;
CREATE TRIGGER trg_notify_rating_after_delivery
  AFTER INSERT OR UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rating_after_delivery();