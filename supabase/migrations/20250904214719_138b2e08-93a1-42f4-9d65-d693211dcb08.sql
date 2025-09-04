-- Insert sample quote_suppliers mappings for testing
INSERT INTO public.quote_suppliers (quote_id, supplier_id) VALUES 
('RFQ02', '27b31fa9-9cdc-480d-8d77-81cf07c12b22'),
('RFQ03', '27b31fa9-9cdc-480d-8d77-81cf07c12b22'),
('RFQ02', '3f9d2ef7-fd2a-4994-85fb-7ddc0c762cc7');

-- Update quotes status to sent so they appear properly
UPDATE public.quotes SET status = 'sent' WHERE id IN ('RFQ02', 'RFQ03');