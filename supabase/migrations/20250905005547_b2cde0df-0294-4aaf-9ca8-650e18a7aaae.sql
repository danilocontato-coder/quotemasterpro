-- Inserir algumas aprovações de exemplo para teste
INSERT INTO public.approvals (quote_id, approver_id, status, comments, created_at, updated_at) VALUES
('RFQ02', '9078179f-cf8e-48d2-a23e-9b4113bbe475', 'pending', NULL, now(), now()),
('RFQ03', '9078179f-cf8e-48d2-a23e-9b4113bbe475', 'approved', 'Aprovado para teste do sistema', now() - interval '1 day', now()),
('RFQ04', '9078179f-cf8e-48d2-a23e-9b4113bbe475', 'rejected', 'Valor muito alto, solicitar nova cotação', now() - interval '2 days', now());

-- Atualizar as cotações com valores de exemplo para melhor visualização
UPDATE public.quotes 
SET total = 2500.00, items_count = 3
WHERE id = 'RFQ02';

UPDATE public.quotes 
SET total = 15000.00, items_count = 8, supplier_name = 'Fornecedor Alpha'
WHERE id = 'RFQ03';

UPDATE public.quotes 
SET total = 850.00, items_count = 2, supplier_name = 'Fornecedor Beta'
WHERE id = 'RFQ04';