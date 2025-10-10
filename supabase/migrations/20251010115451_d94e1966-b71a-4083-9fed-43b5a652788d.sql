-- ============================================
-- MÓDULO DE GESTÃO DE CONTRATOS
-- ============================================

-- 1. Criar tabela de contadores de contratos por cliente
CREATE TABLE IF NOT EXISTS public.client_contract_counters (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Function para gerar próximo ID de contrato
CREATE OR REPLACE FUNCTION public.next_contract_id_by_client(p_client_id UUID, prefix TEXT DEFAULT 'CTR')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n INTEGER;
  code_text TEXT;
BEGIN
  INSERT INTO public.client_contract_counters (client_id, current_counter)
  VALUES (p_client_id, 1)
  ON CONFLICT (client_id) 
  DO UPDATE SET 
    current_counter = client_contract_counters.current_counter + 1,
    updated_at = NOW()
  RETURNING current_counter INTO n;
  
  code_text := prefix || lpad(n::text, 3, '0');
  RETURN code_text;
END;
$$;

-- 3. Criar tabela principal de contratos
CREATE TABLE public.contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('fornecimento', 'servico', 'locacao', 'manutencao', 'outros')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'suspenso', 'renovacao_pendente', 'expirado', 'cancelado')),
  
  -- Valores e financeiro
  total_value NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_terms TEXT,
  
  -- Datas críticas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Alertas e notificações
  alert_days_before INTEGER DEFAULT 30,
  auto_renewal BOOLEAN DEFAULT false,
  renewal_terms TEXT,
  
  -- Anexos e documentos
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Responsáveis
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadados
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trigger para auto-gerar ID do contrato
CREATE OR REPLACE FUNCTION public.trg_contracts_set_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := public.next_contract_id_by_client(NEW.client_id, 'CTR');
  END IF;
  IF NEW.contract_number IS NULL OR btrim(NEW.contract_number) = '' THEN
    NEW.contract_number := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_contracts_set_id
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contracts_set_id();

-- 5. Criar tabela de histórico de contratos
CREATE TABLE public.contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'criacao', 'ativacao', 'reajuste', 'aditivo', 'renovacao', 
    'suspensao', 'reativacao', 'cancelamento', 'expiracao', 'revisao'
  )),
  
  event_date DATE NOT NULL,
  old_value NUMERIC(15,2),
  new_value NUMERIC(15,2),
  adjustment_percentage NUMERIC(5,2),
  adjustment_index TEXT,
  
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  changed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar tabela de alertas de contratos
CREATE TABLE public.contract_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'vencimento_proximo', 'renovacao_pendente', 'reajuste_programado', 
    'revisao_necessaria', 'pagamento_pendente', 'documento_expirado'
  )),
  
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'visualizado', 'resolvido', 'ignorado')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT,
  due_date DATE,
  
  notified_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar tabela de reajustes de contratos
CREATE TABLE public.contract_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  
  adjustment_date DATE NOT NULL,
  previous_value NUMERIC(15,2) NOT NULL,
  new_value NUMERIC(15,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  
  index_type TEXT,
  index_value NUMERIC(5,4),
  
  justification TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'programado' CHECK (status IN ('programado', 'aplicado', 'cancelado')),
  
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Criar índices para performance
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_end_date ON public.contracts(end_date);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_supplier_id ON public.contracts(supplier_id);

CREATE INDEX idx_contract_history_contract_id ON public.contract_history(contract_id);
CREATE INDEX idx_contract_history_event_type ON public.contract_history(event_type);

CREATE INDEX idx_contract_alerts_contract_id ON public.contract_alerts(contract_id);
CREATE INDEX idx_contract_alerts_status ON public.contract_alerts(status);
CREATE INDEX idx_contract_alerts_due_date ON public.contract_alerts(due_date);

CREATE INDEX idx_contract_adjustments_contract_id ON public.contract_adjustments(contract_id);
CREATE INDEX idx_contract_adjustments_date ON public.contract_adjustments(adjustment_date);

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contract_counters ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies para contracts
CREATE POLICY "contracts_select" ON public.contracts
  FOR SELECT USING (
    user_has_module_access('contracts') AND (
      client_id = get_current_user_client_id() OR 
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT WITH CHECK (
    user_has_module_access('contracts') AND 
    client_id = get_current_user_client_id() AND
    created_by = auth.uid()
  );

CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE USING (
    user_has_module_access('contracts') AND (
      client_id = get_current_user_client_id() OR 
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE USING (
    user_has_module_access('contracts') AND (
      (client_id = get_current_user_client_id() AND has_role_text(auth.uid(), 'admin_cliente')) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

-- 11. RLS Policies para contract_history
CREATE POLICY "contract_history_select" ON public.contract_history
  FOR SELECT USING (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_history.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contract_history_insert" ON public.contract_history
  FOR INSERT WITH CHECK (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_history.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

-- 12. RLS Policies para contract_alerts
CREATE POLICY "contract_alerts_select" ON public.contract_alerts
  FOR SELECT USING (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_alerts.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contract_alerts_insert" ON public.contract_alerts
  FOR INSERT WITH CHECK (
    user_has_module_access('contracts') OR
    has_role_text(auth.uid(), 'admin')
  );

CREATE POLICY "contract_alerts_update" ON public.contract_alerts
  FOR UPDATE USING (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_alerts.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

-- 13. RLS Policies para contract_adjustments
CREATE POLICY "contract_adjustments_select" ON public.contract_adjustments
  FOR SELECT USING (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_adjustments.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contract_adjustments_insert" ON public.contract_adjustments
  FOR INSERT WITH CHECK (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_adjustments.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

CREATE POLICY "contract_adjustments_update" ON public.contract_adjustments
  FOR UPDATE USING (
    user_has_module_access('contracts') AND (
      EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_adjustments.contract_id AND client_id = get_current_user_client_id()) OR
      has_role_text(auth.uid(), 'admin')
    )
  );

-- 14. RLS Policies para client_contract_counters
CREATE POLICY "client_contract_counters_select" ON public.client_contract_counters
  FOR SELECT USING (
    client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin')
  );

CREATE POLICY "client_contract_counters_insert" ON public.client_contract_counters
  FOR INSERT WITH CHECK (
    client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin')
  );

CREATE POLICY "client_contract_counters_update" ON public.client_contract_counters
  FOR UPDATE USING (
    client_id = get_current_user_client_id() OR has_role_text(auth.uid(), 'admin')
  );

-- 15. Trigger para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION public.log_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO public.contract_history (
      contract_id, event_type, event_date, description, changed_by
    ) VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'ativo' THEN 'ativacao'
        WHEN 'suspenso' THEN 'suspensao'
        WHEN 'cancelado' THEN 'cancelamento'
        WHEN 'expirado' THEN 'expiracao'
        ELSE 'revisao'
      END,
      CURRENT_DATE,
      format('Status alterado de "%s" para "%s"', OLD.status, NEW.status),
      auth.uid()
    );
  END IF;
  
  IF OLD.total_value != NEW.total_value THEN
    INSERT INTO public.contract_history (
      contract_id, event_type, event_date, old_value, new_value, description, changed_by
    ) VALUES (
      NEW.id,
      'reajuste',
      CURRENT_DATE,
      OLD.total_value,
      NEW.total_value,
      format('Valor alterado de R$ %s para R$ %s', OLD.total_value, NEW.total_value),
      auth.uid()
    );
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_contract_changes
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contract_changes();

-- 16. Function para gerar alertas automáticos de contratos
CREATE OR REPLACE FUNCTION public.generate_contract_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contract_record RECORD;
  days_until_expiry INTEGER;
BEGIN
  FOR contract_record IN
    SELECT * FROM public.contracts
    WHERE status = 'ativo'
      AND end_date IS NOT NULL
      AND end_date >= CURRENT_DATE
      AND end_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(alert_days_before, 30)
      AND NOT EXISTS (
        SELECT 1 FROM public.contract_alerts
        WHERE contract_id = contracts.id
          AND alert_type = 'vencimento_proximo'
          AND status IN ('pendente', 'visualizado')
          AND created_at > CURRENT_DATE - INTERVAL '7 days'
      )
  LOOP
    days_until_expiry := contract_record.end_date - CURRENT_DATE;
    
    INSERT INTO public.contract_alerts (
      contract_id, alert_type, severity, title, message, due_date
    ) VALUES (
      contract_record.id,
      'vencimento_proximo',
      CASE
        WHEN days_until_expiry <= 7 THEN 'critical'
        WHEN days_until_expiry <= 15 THEN 'high'
        ELSE 'medium'
      END,
      'Contrato próximo do vencimento',
      format('O contrato "%s" vence em %s dias', contract_record.title, days_until_expiry),
      contract_record.end_date
    );
    
    PERFORM public.notify_client_users(
      contract_record.client_id,
      'Contrato próximo do vencimento',
      format('O contrato "%s" vence em %s dias. Clique para revisar.', contract_record.title, days_until_expiry),
      'warning',
      CASE
        WHEN days_until_expiry <= 7 THEN 'high'
        ELSE 'normal'
      END,
      '/contracts/' || contract_record.id,
      jsonb_build_object('contract_id', contract_record.id, 'days_until_expiry', days_until_expiry)
    );
  END LOOP;
  
  FOR contract_record IN
    SELECT * FROM public.contracts
    WHERE status = 'ativo'
      AND auto_renewal = false
      AND end_date BETWEEN CURRENT_DATE + INTERVAL '25 days' AND CURRENT_DATE + INTERVAL '35 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.contract_alerts
        WHERE contract_id = contracts.id
          AND alert_type = 'renovacao_pendente'
          AND status IN ('pendente', 'visualizado')
      )
  LOOP
    INSERT INTO public.contract_alerts (
      contract_id, alert_type, severity, title, message, action_required, due_date
    ) VALUES (
      contract_record.id,
      'renovacao_pendente',
      'high',
      'Renovação de contrato necessária',
      format('O contrato "%s" precisa de decisão sobre renovação', contract_record.title),
      'Decidir renovar, renegociar ou encerrar contrato',
      contract_record.end_date
    );
  END LOOP;
END;
$$;

-- 17. Registrar audit log da criação do módulo
INSERT INTO public.audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  '337ec439-2adf-4c3c-a798-b7065ab92ce6',
  'MODULE_CREATED',
  'module',
  'contracts',
  'system',
  jsonb_build_object(
    'module_name', 'Gestão de Contratos',
    'tables_created', ARRAY['contracts', 'contract_history', 'contract_alerts', 'contract_adjustments', 'client_contract_counters'],
    'functions_created', ARRAY['next_contract_id_by_client', 'trg_contracts_set_id', 'log_contract_changes', 'generate_contract_alerts']
  )
);