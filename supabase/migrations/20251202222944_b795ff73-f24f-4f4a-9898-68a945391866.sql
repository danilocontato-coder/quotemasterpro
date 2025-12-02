-- Adicionar coluna attachment_url na tabela quote_responses
ALTER TABLE quote_responses 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN quote_responses.attachment_url IS 'URL do anexo (PDF/imagem) da proposta do fornecedor';