-- Verificar se já existem templates e criar apenas se não existirem
DO $$ 
BEGIN
  -- Inserir template Equilibrado se não existir
  IF NOT EXISTS (SELECT 1 FROM public.decision_matrix_templates WHERE name = 'Equilibrado' AND is_system = true) THEN
    INSERT INTO public.decision_matrix_templates (name, description, weights, is_system, client_id)
    VALUES (
      'Equilibrado',
      'Balanceia preço, prazo e qualidade de forma equilibrada',
      '{"price": 40, "deliveryTime": 20, "shippingCost": 15, "sla": 8, "warranty": 12, "reputation": 5}'::jsonb,
      true,
      NULL
    );
  END IF;

  -- Inserir template Foco em Preço se não existir
  IF NOT EXISTS (SELECT 1 FROM public.decision_matrix_templates WHERE name = 'Foco em Preço' AND is_system = true) THEN
    INSERT INTO public.decision_matrix_templates (name, description, weights, is_system, client_id)
    VALUES (
      'Foco em Preço',
      'Prioriza o menor custo total acima de outros fatores',
      '{"price": 70, "deliveryTime": 10, "shippingCost": 15, "sla": 0, "warranty": 3, "reputation": 2}'::jsonb,
      true,
      NULL
    );
  END IF;

  -- Inserir template Foco em Qualidade se não existir
  IF NOT EXISTS (SELECT 1 FROM public.decision_matrix_templates WHERE name = 'Foco em Qualidade' AND is_system = true) THEN
    INSERT INTO public.decision_matrix_templates (name, description, weights, is_system, client_id)
    VALUES (
      'Foco em Qualidade',
      'Prioriza garantia, SLA e reputação do fornecedor',
      '{"price": 20, "deliveryTime": 15, "shippingCost": 10, "sla": 20, "warranty": 25, "reputation": 10}'::jsonb,
      true,
      NULL
    );
  END IF;

  -- Inserir template Urgente se não existir
  IF NOT EXISTS (SELECT 1 FROM public.decision_matrix_templates WHERE name = 'Urgente' AND is_system = true) THEN
    INSERT INTO public.decision_matrix_templates (name, description, weights, is_system, client_id)
    VALUES (
      'Urgente',
      'Prioriza prazo de entrega rápido',
      '{"price": 25, "deliveryTime": 50, "shippingCost": 10, "sla": 10, "warranty": 3, "reputation": 2}'::jsonb,
      true,
      NULL
    );
  END IF;
END $$;