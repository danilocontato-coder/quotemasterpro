-- Atualizar status da cotação de volta para 'received' para mostrar que tem propostas
UPDATE quotes 
SET status = 'received', 
    updated_at = now()
WHERE id = 'RFQ12' AND status = 'ai_analyzing';