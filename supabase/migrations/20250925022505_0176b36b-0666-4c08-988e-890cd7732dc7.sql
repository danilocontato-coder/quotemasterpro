-- Permitir supplier_id como nullable na tabela payments
ALTER TABLE public.payments ALTER COLUMN supplier_id DROP NOT NULL;