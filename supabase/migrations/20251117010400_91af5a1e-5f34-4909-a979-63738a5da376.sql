-- Adicionar campo asaas_due_date para controle de expiração de boletos
ALTER TABLE public.payments 
ADD COLUMN asaas_due_date DATE NULL;

COMMENT ON COLUMN public.payments.asaas_due_date IS 'Data de vencimento do boleto/PIX no Asaas para controle de expiração';