-- Configurar PIX de teste para fornecedor "teste 2"
UPDATE suppliers 
SET pix_key = '53585535000133'
WHERE id = 'ad06455f-ab22-4868-9248-a2cdc16ee7dc';

-- Adicionar mais um fornecedor de teste com PIX tipo e-mail
UPDATE suppliers 
SET pix_key = 'contato@veslam.com.br'
WHERE id = '922c28ab-452b-4b76-a772-439606a2cf41';