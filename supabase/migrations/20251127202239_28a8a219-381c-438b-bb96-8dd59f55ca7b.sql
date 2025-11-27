-- ============================================
-- Fase 3: Estrutura para Condições de Pagamento (Parcelamento)
-- ============================================

-- 1. Adicionar colunas em quote_responses para condições de pagamento
ALTER TABLE public.quote_responses
ADD COLUMN IF NOT EXISTS payment_conditions JSONB DEFAULT NULL;

COMMENT ON COLUMN public.quote_responses.payment_conditions IS 'Condições de pagamento estruturadas (à vista ou parcelado com datas e percentuais)';

-- 2. Adicionar colunas em payments para suportar parcelas
-- NOTA: payments.id é TEXT, então parent_payment_id também deve ser TEXT
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_payment_id TEXT DEFAULT NULL;

-- Adicionar FK constraint depois de criar a coluna
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_parent_payment_id 
FOREIGN KEY (parent_payment_id) REFERENCES public.payments(id) 
ON DELETE SET NULL;

COMMENT ON COLUMN public.payments.installment_number IS 'Número da parcela (1, 2, 3...)';
COMMENT ON COLUMN public.payments.total_installments IS 'Total de parcelas do parcelamento';
COMMENT ON COLUMN public.payments.parent_payment_id IS 'ID do pagamento pai (para parcelas)';

-- 3. Criar índice para buscar parcelas
CREATE INDEX IF NOT EXISTS idx_payments_parent_payment_id ON public.payments(parent_payment_id) WHERE parent_payment_id IS NOT NULL;

-- 4. Criar tabela de templates de condições de pagamento
CREATE TABLE IF NOT EXISTS public.payment_condition_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Habilitar RLS na tabela de templates
ALTER TABLE public.payment_condition_templates ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para templates
CREATE POLICY "Templates do sistema são visíveis para todos" 
ON public.payment_condition_templates 
FOR SELECT 
USING (is_system = true);

CREATE POLICY "Clientes podem ver seus próprios templates" 
ON public.payment_condition_templates 
FOR SELECT 
USING (client_id = get_current_user_client_id());

CREATE POLICY "Clientes podem criar templates" 
ON public.payment_condition_templates 
FOR INSERT 
WITH CHECK (client_id = get_current_user_client_id() AND is_system = false);

CREATE POLICY "Clientes podem atualizar seus templates" 
ON public.payment_condition_templates 
FOR UPDATE 
USING (client_id = get_current_user_client_id() AND is_system = false);

CREATE POLICY "Clientes podem deletar seus templates" 
ON public.payment_condition_templates 
FOR DELETE 
USING (client_id = get_current_user_client_id() AND is_system = false);

CREATE POLICY "Admins podem gerenciar todos os templates" 
ON public.payment_condition_templates 
FOR ALL 
USING (has_any_role(ARRAY['admin', 'super_admin']));

-- 7. Inserir templates padrão do sistema
INSERT INTO public.payment_condition_templates (name, description, conditions, is_system) VALUES
('À Vista', 'Pagamento integral no ato', '{"type": "a_vista", "installments": [{"number": 1, "days": 0, "percentage": 100}], "description": "À Vista"}'::jsonb, true),
('30 Dias', 'Pagamento em 30 dias', '{"type": "a_vista", "installments": [{"number": 1, "days": 30, "percentage": 100}], "description": "30 Dias"}'::jsonb, true),
('7/14/21 Dias', 'Parcelamento em 3x (7, 14 e 21 dias)', '{"type": "parcelado", "installments": [{"number": 1, "days": 7, "percentage": 33.33}, {"number": 2, "days": 14, "percentage": 33.33}, {"number": 3, "days": 21, "percentage": 33.34}], "description": "7/14/21 Dias"}'::jsonb, true),
('30/60/90 Dias', 'Parcelamento em 3x (30, 60 e 90 dias)', '{"type": "parcelado", "installments": [{"number": 1, "days": 30, "percentage": 33.33}, {"number": 2, "days": 60, "percentage": 33.33}, {"number": 3, "days": 90, "percentage": 33.34}], "description": "30/60/90 Dias"}'::jsonb, true),
('28/56 Dias', 'Parcelamento em 2x (28 e 56 dias)', '{"type": "parcelado", "installments": [{"number": 1, "days": 28, "percentage": 50}, {"number": 2, "days": 56, "percentage": 50}], "description": "28/56 Dias"}'::jsonb, true);

-- 8. Trigger para updated_at na tabela de templates
CREATE OR REPLACE FUNCTION update_payment_condition_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_payment_condition_templates_updated_at ON public.payment_condition_templates;
CREATE TRIGGER trg_payment_condition_templates_updated_at
BEFORE UPDATE ON public.payment_condition_templates
FOR EACH ROW
EXECUTE FUNCTION update_payment_condition_templates_updated_at();