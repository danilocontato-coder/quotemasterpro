-- Popular payment_id nas entregas existentes
UPDATE deliveries d
SET payment_id = p.id
FROM payments p
WHERE d.quote_id = p.quote_id
AND d.payment_id IS NULL;