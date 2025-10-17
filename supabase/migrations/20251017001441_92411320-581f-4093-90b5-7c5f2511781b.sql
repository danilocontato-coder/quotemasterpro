-- Adicionar campo asaas_customer_id na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

COMMENT ON COLUMN public.clients.asaas_customer_id IS 'ID do customer no Asaas para receber cobranças';