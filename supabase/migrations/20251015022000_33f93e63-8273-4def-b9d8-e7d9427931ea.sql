-- Atualizar templates existentes para usar deliveryScore ao invés de sla
UPDATE public.decision_matrix_templates 
SET weights = jsonb_set(
  weights - 'sla',
  '{deliveryScore}',
  COALESCE(weights->'sla', '8'::jsonb)
)
WHERE weights ? 'sla' AND NOT weights ? 'deliveryScore';