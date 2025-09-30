-- Atualizar centros de custo padrão para refletir realidade de empresas/condomínios
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

  -- Criar centros de custo padrão realistas para empresas/condomínios
  INSERT INTO public.cost_centers (client_id, name, code, description, budget_monthly, budget_annual, active) VALUES
  (p_client_id, 'Administração e Gestão', 'ADM', 'Salários administrativos, contabilidade, jurídico e gestão geral', 12000.00, 144000.00, true),
  (p_client_id, 'Manutenção Predial', 'MNT', 'Reparos, manutenção preventiva e corretiva das instalações', 15000.00, 180000.00, true),
  (p_client_id, 'Limpeza e Conservação', 'LMP', 'Serviços de limpeza, materiais de limpeza e conservação', 8000.00, 96000.00, true),
  (p_client_id, 'Segurança e Vigilância', 'SEG', 'Portaria, vigilância, monitoramento e sistema de segurança', 10000.00, 120000.00, true),
  (p_client_id, 'Jardinagem e Paisagismo', 'JRD', 'Manutenção de jardins, áreas verdes e paisagismo', 3000.00, 36000.00, true),
  (p_client_id, 'Água e Esgoto', 'AGU', 'Consumo de água, esgoto e tratamento', 5000.00, 60000.00, true),
  (p_client_id, 'Energia Elétrica', 'ENE', 'Consumo de energia elétrica de áreas comuns', 7000.00, 84000.00, true),
  (p_client_id, 'Elevadores', 'ELE', 'Manutenção e conservação de elevadores', 4000.00, 48000.00, true),
  (p_client_id, 'Obras e Reformas', 'OBR', 'Obras, reformas e melhorias nas instalações', 10000.00, 120000.00, true),
  (p_client_id, 'Material de Escritório', 'MAT', 'Materiais de expediente e suprimentos administrativos', 1500.00, 18000.00, true),
  (p_client_id, 'Comunicação e Marketing', 'COM', 'Comunicação com condôminos, site, aplicativos e divulgação', 2000.00, 24000.00, true),
  (p_client_id, 'Reserva de Emergência', 'EMG', 'Fundo de reserva para despesas imprevistas e emergenciais', 5000.00, 60000.00, true)
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
