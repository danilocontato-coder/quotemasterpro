-- Adicionar campo asaas_customer_id na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id ON public.clients(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_clients_asaas_subscription_id ON public.clients(asaas_subscription_id);

-- Comentários
COMMENT ON COLUMN public.clients.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN public.clients.asaas_subscription_id IS 'ID da assinatura recorrente no Asaas';