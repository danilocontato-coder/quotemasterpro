-- Criar tabela de entregas
CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id text NOT NULL,
  supplier_id uuid NOT NULL,
  client_id uuid NOT NULL,
  delivery_address text NOT NULL,
  scheduled_date timestamp with time zone NOT NULL,
  actual_delivery_date timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled',
  tracking_code text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "deliveries_supplier_access" 
ON public.deliveries 
FOR ALL 
USING (supplier_id IN (SELECT profiles.supplier_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "deliveries_client_access" 
ON public.deliveries 
FOR SELECT 
USING (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "deliveries_admin_access" 
ON public.deliveries 
FOR ALL 
USING (get_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger para notificar cliente quando entrega for criada
CREATE OR REPLACE FUNCTION public.notify_client_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação para usuários do cliente
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER delivery_notify_client
AFTER INSERT ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_delivery();