-- Add missing columns to quote_responses table for supplier proposals
ALTER TABLE public.quote_responses 
ADD COLUMN payment_terms TEXT DEFAULT '30 dias',
ADD COLUMN items JSONB DEFAULT '[]'::jsonb;