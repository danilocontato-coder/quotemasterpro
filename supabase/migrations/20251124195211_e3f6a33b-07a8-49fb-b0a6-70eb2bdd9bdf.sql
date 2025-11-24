-- Remover pagamento órfão sem asaas_payment_id para permitir nova emissão
DELETE FROM payments 
WHERE id = 'PAY006' 
  AND quote_id = 'fe725d9e-5f42-4a3f-9428-67e1acb60973' 
  AND asaas_payment_id IS NULL
  AND status = 'pending';