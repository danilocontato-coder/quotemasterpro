-- Corrigir função para criar centros de custo padrão (evitar duplicatas)
CREATE OR REPLACE FUNCTION public.create_default_cost_centers(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se já existem centros de custo para este cliente
  IF EXISTS (
    SELECT 1 FROM public.cost_centers WHERE client_id = p_client_id LIMIT 1
  ) THEN
    -- Já existem centros de custo, não fazer nada
    RETURN;
  END IF;

  -- Criar centros de custo padrão
  INSERT INTO public.cost_centers (client_id, name, code, description, budget_monthly, budget_annual, active) VALUES
  (p_client_id, 'Administração', 'ADM', 'Gastos administrativos e gestão', 5000.00, 60000.00, true),
  (p_client_id, 'Manutenção', 'MNT', 'Manutenção predial e equipamentos', 8000.00, 96000.00, true),
  (p_client_id, 'Limpeza', 'LMP', 'Serviços de limpeza e materiais', 3000.00, 36000.00, true),
  (p_client_id, 'Segurança', 'SEG', 'Segurança patrimonial e monitoramento', 4000.00, 48000.00, true),
  (p_client_id, 'Jardim e Paisagismo', 'JRD', 'Manutenção de áreas verdes', 2000.00, 24000.00, true),
  (p_client_id, 'Emergência', 'EMG', 'Gastos emergenciais não planejados', 1000.00, 12000.00, true)
  ON CONFLICT (client_id, code) DO NOTHING;
  
  -- Log da criação
  INSERT INTO public.audit_logs (
    action, 
    entity_type, 
    entity_id, 
    panel_type, 
    details
  ) VALUES (
    'DEFAULT_COST_CENTERS_CREATED',
    'cost_centers',
    p_client_id::text,
    'system',
    '{"message": "Centros de custo padrão criados automaticamente"}'::jsonb
  );
END;
$$;