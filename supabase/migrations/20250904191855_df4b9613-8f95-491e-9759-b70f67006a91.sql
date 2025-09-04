-- Ajustar função com search_path e política de INSERT
CREATE OR REPLACE FUNCTION public.notify_client_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, priority, metadata)
  SELECT p.id,
         'Nova Entrega Agendada',
         'Uma nova entrega foi agendada para a cotação ' || NEW.quote_id,
         'delivery',
         'normal',
         jsonb_build_object(
           'delivery_id', NEW.id,
           'quote_id', NEW.quote_id,
           'supplier_id', NEW.supplier_id,
           'scheduled_date', NEW.scheduled_date
         )
  FROM public.profiles p
  WHERE p.client_id = NEW.client_id;
  RETURN NEW;
END;
$$;

-- Permitir INSERT para fornecedores
CREATE POLICY deliveries_supplier_insert
ON public.deliveries
FOR INSERT
WITH CHECK (
  supplier_id IN (
    SELECT profiles.supplier_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
);

-- Opcional: permitir INSERT para admin
CREATE POLICY deliveries_admin_insert
ON public.deliveries
FOR INSERT
WITH CHECK (get_user_role() = 'admin');