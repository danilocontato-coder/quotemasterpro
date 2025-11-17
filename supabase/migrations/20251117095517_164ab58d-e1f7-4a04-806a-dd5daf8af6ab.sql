-- Fase 1: Remover trigger e função automáticos
DROP TRIGGER IF EXISTS trg_create_delivery ON public.payments;
DROP FUNCTION IF EXISTS public.create_delivery_on_escrow();

-- Fase 2: Limpar delivery criada automaticamente
DELETE FROM public.deliveries 
WHERE id = '1f732848-c6b9-4626-b115-3e1a270289bb'
  AND status = 'pending';

-- Fase 3: Limpar notificações incorretas enviadas pelo trigger
DELETE FROM public.notifications
WHERE type = 'delivery'
  AND title = 'Nova Entrega Agendada'
  AND created_at > NOW() - INTERVAL '2 hours';

-- Fase 4: Adicionar audit log da correção
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  details
) VALUES (
  'TRIGGER_REMOVED',
  'migrations',
  'trg_create_delivery',
  jsonb_build_object(
    'trigger_name', 'trg_create_delivery',
    'function_name', 'create_delivery_on_escrow',
    'reason', 'Criação automática de deliveries conflita com fluxo manual de agendamento pelo fornecedor',
    'corrected_at', NOW(),
    'affected_delivery_id', '1f732848-c6b9-4626-b115-3e1a270289bb',
    'impact', 'Agora o fornecedor deve agendar manualmente via edge function schedule-delivery'
  )
);