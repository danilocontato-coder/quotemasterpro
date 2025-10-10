-- Migration 2: Adicionar colunas de visita técnica na tabela quotes

-- Adicionar coluna para indicar se requer visita
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS requires_visit BOOLEAN DEFAULT false;

-- Adicionar coluna para prazo desejado da visita
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS visit_deadline TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.quotes.requires_visit IS 'Se verdadeiro, cotação requer visita técnica antes da proposta';
COMMENT ON COLUMN public.quotes.visit_deadline IS 'Prazo sugerido pelo cliente para a visita técnica';