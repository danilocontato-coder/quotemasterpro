-- Corrigir políticas da tabela deliveries
DROP POLICY IF EXISTS "deliveries_client_access" ON public.deliveries;

CREATE POLICY "deliveries_select" ON public.deliveries
FOR SELECT USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
);

CREATE POLICY "deliveries_insert" ON public.deliveries
FOR INSERT WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id = get_current_user_supplier_id())
);

CREATE POLICY "deliveries_update" ON public.deliveries
FOR UPDATE USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
);

-- Criar trigger para criar entrega quando pagamento vai para escrow
CREATE OR REPLACE FUNCTION public.create_delivery_on_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Quando pagamento vai para escrow, criar registro de entrega
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
    
    -- Notificar fornecedor sobre entrega pendente
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
$$;

DROP TRIGGER IF EXISTS trg_create_delivery ON public.payments;
CREATE TRIGGER trg_create_delivery
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_delivery_on_escrow();