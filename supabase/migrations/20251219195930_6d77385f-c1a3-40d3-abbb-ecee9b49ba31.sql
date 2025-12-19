-- Reset PAY012 para novo teste de liberação de fundos
UPDATE payments 
SET 
  asaas_transfer_id = NULL,
  transfer_status = 'pending',
  transfer_error = NULL,
  status = 'in_escrow'
WHERE id = 'PAY012';