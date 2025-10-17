-- Remover trigger de log financeiro da tabela payments que causa erro JSON
-- Payments já tem auditoria própria via approve_offline_payment

DROP TRIGGER IF EXISTS log_payment_changes ON public.payments;

-- Comentar para documentação
COMMENT ON TABLE public.payments IS 'Pagamentos - auditoria feita via função approve_offline_payment e outros triggers específicos';