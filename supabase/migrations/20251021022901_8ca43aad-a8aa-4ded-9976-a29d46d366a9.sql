-- Corrigir dados inconsistentes de entrega já confirmada
-- Entrega: 290de577-4bb8-4682-ad25-5b262ef13650

UPDATE deliveries
SET 
  status = 'delivered',
  actual_delivery_date = '2025-10-18 09:21:48.138+00',
  updated_at = NOW()
WHERE id = '290de577-4bb8-4682-ad25-5b262ef13650'
  AND status = 'in_transit';

-- Corrigir pagamento associado à cotação
UPDATE payments
SET 
  status = 'completed',
  updated_at = NOW()
WHERE quote_id = 'b324040c-027e-483e-b850-53b84fea6e2e'
  AND status = 'in_escrow';