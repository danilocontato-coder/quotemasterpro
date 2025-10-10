-- Migration 3: Criar tabela visit_settings para configurações de visitas por cliente

CREATE TABLE public.visit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Configurações de tolerância
  overdue_tolerance_days INT NOT NULL DEFAULT 2 CHECK (overdue_tolerance_days >= 0 AND overdue_tolerance_days <= 10),
  max_reschedule_attempts INT NOT NULL DEFAULT 3 CHECK (max_reschedule_attempts >= 1 AND max_reschedule_attempts <= 10),
  
  -- Ações automáticas
  auto_disqualify_on_overdue BOOLEAN DEFAULT false,
  auto_confirm_after_days INT CHECK (auto_confirm_after_days IS NULL OR (auto_confirm_after_days >= 0 AND auto_confirm_after_days <= 30)),
  
  -- Notificações
  notify_before_visit_days INT DEFAULT 1 CHECK (notify_before_visit_days >= 0 AND notify_before_visit_days <= 7),
  notify_on_overdue BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir apenas um registro por cliente
  UNIQUE(client_id)
);

-- Índices
CREATE INDEX idx_visit_settings_client_id ON public.visit_settings(client_id);

-- RLS
ALTER TABLE public.visit_settings ENABLE ROW LEVEL SECURITY;

-- Clientes podem ver e editar suas próprias configurações
CREATE POLICY "visit_settings_client_all" ON public.visit_settings
  FOR ALL USING (
    client_id = get_current_user_client_id() OR 
    get_user_role() = 'admin'
  )
  WITH CHECK (
    client_id = get_current_user_client_id() OR 
    get_user_role() = 'admin'
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER trg_visit_settings_updated_at
BEFORE UPDATE ON public.visit_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.visit_settings IS 'Configurações de gerenciamento de visitas técnicas por cliente';
COMMENT ON COLUMN public.visit_settings.overdue_tolerance_days IS 'Dias de tolerância antes de considerar visita atrasada (0-10)';
COMMENT ON COLUMN public.visit_settings.max_reschedule_attempts IS 'Número máximo de reagendamentos permitidos (1-10)';
COMMENT ON COLUMN public.visit_settings.auto_disqualify_on_overdue IS 'Se true, desqualifica fornecedor automaticamente quando visita atrasa';
COMMENT ON COLUMN public.visit_settings.auto_confirm_after_days IS 'Se definido, confirma visita automaticamente após X dias da data agendada';