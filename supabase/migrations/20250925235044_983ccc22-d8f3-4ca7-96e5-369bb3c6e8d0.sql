-- Função para criar centros de custo padrão para novos clientes
CREATE OR REPLACE FUNCTION public.create_default_cost_centers(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Criar centros de custo padrão
  INSERT INTO public.cost_centers (client_id, name, code, description, budget_monthly, budget_annual, active) VALUES
  (p_client_id, 'Administração', 'ADM', 'Gastos administrativos e gestão', 5000.00, 60000.00, true),
  (p_client_id, 'Manutenção', 'MNT', 'Manutenção predial e equipamentos', 8000.00, 96000.00, true),
  (p_client_id, 'Limpeza', 'LMP', 'Serviços de limpeza e materiais', 3000.00, 36000.00, true),
  (p_client_id, 'Segurança', 'SEG', 'Segurança patrimonial e monitoramento', 4000.00, 48000.00, true),
  (p_client_id, 'Jardim e Paisagismo', 'JRD', 'Manutenção de áreas verdes', 2000.00, 24000.00, true),
  (p_client_id, 'Emergência', 'EMG', 'Gastos emergenciais não planejados', 1000.00, 12000.00, true);
  
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

-- Modificar função de inicialização do cliente para incluir centros de custo
CREATE OR REPLACE FUNCTION public.initialize_client_data(client_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Criar registro de usage para o cliente
  INSERT INTO public.client_usage (client_id, quotes_this_month, users_count, storage_used_gb)
  VALUES (client_uuid, 0, 0, 0)
  ON CONFLICT (client_id) DO NOTHING;
  
  -- Criar centros de custo padrão
  PERFORM public.create_default_cost_centers(client_uuid);
  
  -- Log da inicialização
  INSERT INTO public.audit_logs (
    action, 
    entity_type, 
    entity_id, 
    panel_type, 
    details
  ) VALUES (
    'CLIENT_INITIALIZED',
    'clients',
    client_uuid::text,
    'system',
    '{"message": "Cliente inicializado com dados próprios e centros de custo padrão"}'::jsonb
  );
END;
$$;