-- Adicionar campos para integração Uber Direct na tabela deliveries
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'own' CHECK (delivery_method IN ('own', 'uber')),
ADD COLUMN IF NOT EXISTS uber_delivery_id TEXT,
ADD COLUMN IF NOT EXISTS uber_quote_id TEXT,
ADD COLUMN IF NOT EXISTS uber_status TEXT,
ADD COLUMN IF NOT EXISTS uber_tracking_url TEXT,
ADD COLUMN IF NOT EXISTS uber_courier_name TEXT,
ADD COLUMN IF NOT EXISTS uber_courier_phone TEXT,
ADD COLUMN IF NOT EXISTS uber_courier_location JSONB,
ADD COLUMN IF NOT EXISTS uber_fee NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS uber_metadata JSONB DEFAULT '{}'::jsonb;

-- Comentários explicativos
COMMENT ON COLUMN public.deliveries.delivery_method IS 'Método de entrega: own (própria) ou uber (Uber Direct)';
COMMENT ON COLUMN public.deliveries.uber_delivery_id IS 'ID da entrega retornado pela Uber API';
COMMENT ON COLUMN public.deliveries.uber_quote_id IS 'ID da cotação de preço da Uber';
COMMENT ON COLUMN public.deliveries.uber_status IS 'Status retornado pela Uber (pending, pickup, dropoff, delivered, canceled, returned)';
COMMENT ON COLUMN public.deliveries.uber_tracking_url IS 'URL de rastreamento em tempo real da Uber';
COMMENT ON COLUMN public.deliveries.uber_courier_name IS 'Nome do entregador da Uber';
COMMENT ON COLUMN public.deliveries.uber_courier_phone IS 'Telefone do entregador da Uber';
COMMENT ON COLUMN public.deliveries.uber_courier_location IS 'Localização em tempo real do entregador (lat/lng)';
COMMENT ON COLUMN public.deliveries.uber_fee IS 'Taxa cobrada pela Uber Direct';
COMMENT ON COLUMN public.deliveries.uber_metadata IS 'Metadados extras da API Uber';