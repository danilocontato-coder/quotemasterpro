-- Adicionar coluna payment_id à tabela deliveries
ALTER TABLE public.deliveries 
ADD COLUMN payment_id TEXT REFERENCES public.payments(id);

-- Criar índice para performance
CREATE INDEX idx_deliveries_payment_id ON public.deliveries(payment_id);

-- Comentário para documentação
COMMENT ON COLUMN public.deliveries.payment_id IS 'Vínculo direto com o pagamento que gerou a entrega';