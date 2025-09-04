-- Adicionar campos para rastrear fornecedores enviados na cotação
ALTER TABLE public.quotes 
ADD COLUMN suppliers_sent_count integer DEFAULT 0;

-- Comentário para documentar o campo
COMMENT ON COLUMN public.quotes.suppliers_sent_count IS 'Número de fornecedores para os quais a cotação foi enviada';

-- Atualizar cotações existentes para ter um valor inicial baseado no responses_count
UPDATE public.quotes 
SET suppliers_sent_count = CASE 
  WHEN status IN ('sent', 'under_review', 'approved', 'rejected') 
  THEN GREATEST(responses_count, 1)
  ELSE 0 
END;