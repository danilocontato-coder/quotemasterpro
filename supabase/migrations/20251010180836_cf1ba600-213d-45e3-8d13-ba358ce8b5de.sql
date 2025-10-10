-- Suporte inicial a CPF/CNPJ sem quebrar dados existentes

-- 1) Novas colunas
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'cnpj';

ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS document_number TEXT;

-- 2) Backfill do número a partir do CNPJ atual (normalizado)
UPDATE public.suppliers 
SET document_number = public.normalize_cnpj(cnpj)
WHERE document_number IS NULL AND cnpj IS NOT NULL;

-- 3) Índice único PARCIAL (apenas para registros válidos), evita falha por dados sujos
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_doc_unique 
ON public.suppliers(document_type, document_number)
WHERE document_number IS NOT NULL 
  AND document_number ~ '^[0-9]+$'
  AND length(document_number) IN (11,14);

-- 4) Comentário
COMMENT ON COLUMN public.suppliers.document_type IS 'Tipo do documento: cpf ou cnpj';
COMMENT ON COLUMN public.suppliers.document_number IS 'Número do documento (apenas dígitos). CPF:11, CNPJ:14';
