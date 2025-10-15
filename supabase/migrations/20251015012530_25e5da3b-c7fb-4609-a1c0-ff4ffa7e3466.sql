-- Criar tabela para templates de matriz de decisão
CREATE TABLE public.decision_matrix_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weights JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_weights_structure CHECK (
    jsonb_typeof(weights) = 'object'
  )
);

-- Criar tabela para matrizes salvas
CREATE TABLE public.saved_decision_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_title TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{}',
  proposals JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_weights_structure_saved CHECK (
    jsonb_typeof(weights) = 'object'
  ),
  CONSTRAINT check_proposals_structure CHECK (
    jsonb_typeof(proposals) = 'array'
  )
);

-- Habilitar RLS
ALTER TABLE public.decision_matrix_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_decision_matrices ENABLE ROW LEVEL SECURITY;

-- Políticas para templates (sistema visível para todos, customizados apenas para o cliente)
CREATE POLICY "Templates do sistema são visíveis para todos"
  ON public.decision_matrix_templates
  FOR SELECT
  USING (is_system = true OR client_id = get_current_user_client_id() OR get_user_role() = 'admin');

CREATE POLICY "Clientes podem criar templates customizados"
  ON public.decision_matrix_templates
  FOR INSERT
  WITH CHECK (
    client_id = get_current_user_client_id() 
    AND is_system = false
  );

CREATE POLICY "Clientes podem editar seus templates"
  ON public.decision_matrix_templates
  FOR UPDATE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

CREATE POLICY "Clientes podem excluir seus templates"
  ON public.decision_matrix_templates
  FOR DELETE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

CREATE POLICY "Admin pode gerenciar todos os templates"
  ON public.decision_matrix_templates
  FOR ALL
  USING (get_user_role() = 'admin');

-- Políticas para matrizes salvas
CREATE POLICY "Clientes veem suas matrizes"
  ON public.saved_decision_matrices
  FOR SELECT
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

CREATE POLICY "Clientes podem criar matrizes"
  ON public.saved_decision_matrices
  FOR INSERT
  WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "Clientes podem editar suas matrizes"
  ON public.saved_decision_matrices
  FOR UPDATE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

CREATE POLICY "Clientes podem excluir suas matrizes"
  ON public.saved_decision_matrices
  FOR DELETE
  USING (client_id = get_current_user_client_id() OR get_user_role() = 'admin');

-- Inserir templates pré-configurados do sistema
INSERT INTO public.decision_matrix_templates (name, description, weights, is_system) VALUES
(
  'Compra Urgente',
  'Prioriza prazo de entrega e disponibilidade imediata',
  '{"price": 20, "deliveryTime": 40, "shippingCost": 10, "sla": 15, "warranty": 5, "reputation": 10}'::jsonb,
  true
),
(
  'Economia Máxima',
  'Foco total em menor preço e custos',
  '{"price": 50, "deliveryTime": 10, "shippingCost": 25, "sla": 5, "warranty": 5, "reputation": 5}'::jsonb,
  true
),
(
  'Qualidade Premium',
  'Prioriza garantia, reputação e SLA',
  '{"price": 10, "deliveryTime": 15, "shippingCost": 5, "sla": 25, "warranty": 30, "reputation": 15}'::jsonb,
  true
),
(
  'Balanceado',
  'Equilíbrio entre todos os critérios',
  '{"price": 20, "deliveryTime": 20, "shippingCost": 15, "sla": 15, "warranty": 15, "reputation": 15}'::jsonb,
  true
),
(
  'Confiabilidade',
  'Foco em reputação e histórico do fornecedor',
  '{"price": 15, "deliveryTime": 15, "shippingCost": 10, "sla": 20, "warranty": 20, "reputation": 20}'::jsonb,
  true
);

-- Criar índices para performance
CREATE INDEX idx_decision_matrix_templates_client ON public.decision_matrix_templates(client_id);
CREATE INDEX idx_decision_matrix_templates_system ON public.decision_matrix_templates(is_system);
CREATE INDEX idx_saved_decision_matrices_client ON public.saved_decision_matrices(client_id);
CREATE INDEX idx_saved_decision_matrices_quote ON public.saved_decision_matrices(quote_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_decision_matrix_templates_updated_at
  BEFORE UPDATE ON public.decision_matrix_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_decision_matrices_updated_at
  BEFORE UPDATE ON public.saved_decision_matrices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();