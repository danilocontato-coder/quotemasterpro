-- Corrigir a função do trigger para sempre converter para TEXT
CREATE OR REPLACE FUNCTION public.log_financial_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.financial_logs (
    entity_type,
    entity_id, 
    action,
    old_data,
    new_data,
    user_id,
    automated
  ) VALUES (
    TG_TABLE_NAME,
    -- Sempre converter para TEXT independente do tipo
    COALESCE(NEW.id::text, OLD.id::text),
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    auth.uid(),
    false
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Agora inserir os dados de exemplo
INSERT INTO public.subscriptions (
  id,
  client_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  created_at,
  asaas_subscription_id
) VALUES
  -- CLIENTE ASAAS - Plano Básico Mensal
  (
    gen_random_uuid(),
    'ef1b16e2-5443-4f16-b72d-e62843e75d4a',
    'plan-basic',
    'active',
    'monthly',
    '2025-09-16 00:00:00+00',
    '2025-10-16 00:00:00+00',
    '2025-09-16 10:00:00+00',
    'sub_123abc'
  ),
  -- Condomínio Residencial Azul - Plano Pro Anual
  (
    gen_random_uuid(),
    'da114bec-1359-4a07-ae95-906e6c70e473',
    'plan-pro',
    'active',
    'yearly',
    '2025-08-20 00:00:00+00',
    '2026-08-20 00:00:00+00',
    '2025-08-20 11:00:00+00',
    'sub_456def'
  ),
  -- Condomínio Validação - Plano Básico Mensal
  (
    gen_random_uuid(),
    'fd3d097b-67c2-46a3-ab48-56386459c73e',
    'plan-basic',
    'active',
    'monthly',
    '2025-09-25 00:00:00+00',
    '2025-10-25 00:00:00+00',
    '2025-09-25 12:00:00+00',
    'sub_789ghi'
  ),
  -- Motiz Mobilidade - Plano Básico Mensal  
  (
    gen_random_uuid(),
    '539adc27-d695-4a61-849b-1fac0d60addd',
    'plan-basic',
    'active',
    'monthly',
    '2025-09-04 00:00:00+00',
    '2025-10-04 00:00:00+00',
    '2025-09-04 14:00:00+00',
    'sub_101jkl'
  ),
  -- Empresa Teste - Plano Básico Mensal (suspenso)
  (
    gen_random_uuid(),
    'ee4814f7-8863-4ce3-aa86-d16e4331a4f2',
    'plan-basic',
    'suspended',
    'monthly',
    '2025-08-01 00:00:00+00',
    '2025-09-01 00:00:00+00',
    '2025-08-01 09:00:00+00',
    'sub_202mno'
  );

-- Inserir faturas relacionadas às assinaturas
INSERT INTO public.invoices (
  id,
  subscription_id,
  client_id,
  amount,
  currency,
  status,
  due_date,
  paid_at,
  payment_method,
  created_at
) VALUES
  -- Faturas pagas - CLIENTE ASAAS
  (
    'INV-001-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'ef1b16e2-5443-4f16-b72d-e62843e75d4a'),
    'ef1b16e2-5443-4f16-b72d-e62843e75d4a',
    49.90,
    'BRL',
    'paid',
    '2025-09-16 00:00:00+00',
    '2025-09-15 14:30:00+00',
    'boleto',
    '2025-08-16 10:00:00+00'
  ),
  (
    'INV-002-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'ef1b16e2-5443-4f16-b72d-e62843e75d4a'),
    'ef1b16e2-5443-4f16-b72d-e62843e75d4a',
    49.90,
    'BRL',
    'open',
    '2025-10-16 00:00:00+00',
    NULL,
    NULL,
    '2025-09-16 10:00:00+00'
  ),
  -- Fatura paga - Condomínio Residencial Azul  
  (
    'INV-003-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'da114bec-1359-4a07-ae95-906e6c70e473'),
    'da114bec-1359-4a07-ae95-906e6c70e473',
    499.90,
    'BRL',
    'paid',
    '2025-08-20 00:00:00+00',
    '2025-08-19 16:45:00+00',
    'stripe',
    '2025-07-20 11:00:00+00'
  ),
  -- Faturas pagas - Condomínio Validação
  (
    'INV-004-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'fd3d097b-67c2-46a3-ab48-56386459c73e'),
    'fd3d097b-67c2-46a3-ab48-56386459c73e',
    49.90,
    'BRL',
    'paid',
    '2025-09-25 00:00:00+00',
    '2025-09-24 11:20:00+00',
    'pix',
    '2025-08-25 12:00:00+00'
  ),
  (
    'INV-005-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'fd3d097b-67c2-46a3-ab48-56386459c73e'),
    'fd3d097b-67c2-46a3-ab48-56386459c73e',
    49.90,
    'BRL',
    'open',
    '2025-10-25 00:00:00+00',
    NULL,
    NULL,
    '2025-09-25 12:00:00+00'
  ),
  -- Faturas pagas - Motiz Mobilidade
  (
    'INV-006-2025',
    (SELECT id FROM subscriptions WHERE client_id = '539adc27-d695-4a61-849b-1fac0d60addd'),
    '539adc27-d695-4a61-849b-1fac0d60addd',
    49.90,
    'BRL',
    'paid',
    '2025-09-04 00:00:00+00',
    '2025-09-03 09:15:00+00',
    'boleto',
    '2025-08-04 14:00:00+00'
  ),
  (
    'INV-007-2025',
    (SELECT id FROM subscriptions WHERE client_id = '539adc27-d695-4a61-849b-1fac0d60addd'),
    '539adc27-d695-4a61-849b-1fac0d60addd',
    49.90,
    'BRL',
    'paid',
    '2025-10-04 00:00:00+00',
    '2025-10-03 15:40:00+00',
    'boleto',
    '2025-09-04 14:00:00+00'
  ),
  -- Fatura vencida - Empresa Teste
  (
    'INV-008-2025',
    (SELECT id FROM subscriptions WHERE client_id = 'ee4814f7-8863-4ce3-aa86-d16e4331a4f2'),
    'ee4814f7-8863-4ce3-aa86-d16e4331a4f2',
    49.90,
    'BRL',
    'past_due',
    '2025-09-01 00:00:00+00',
    NULL,
    NULL,
    '2025-08-01 09:00:00+00'
  );