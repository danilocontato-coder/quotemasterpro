-- ============================================
-- SISTEMA DE GAMIFICAÇÃO - CRÉDITOS E NÍVEIS
-- ============================================

-- 1. Tabela de Créditos de Usuário
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  available_credits INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  level_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- 2. Tabela de Transações de Créditos
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS Policies para user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios créditos"
ON public.user_credits FOR SELECT
USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Sistema pode criar créditos"
ON public.user_credits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar créditos"
ON public.user_credits FOR UPDATE
USING (true);

CREATE POLICY "Admins podem deletar créditos"
ON public.user_credits FOR DELETE
USING (get_user_role() = 'admin');

-- 4. RLS Policies para credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas transações"
ON public.credit_transactions FOR SELECT
USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Sistema pode inserir transações"
ON public.credit_transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins podem deletar transações"
ON public.credit_transactions FOR DELETE
USING (get_user_role() = 'admin');

-- 5. Configuração Padrão de Gamificação em system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'gamification_config',
  '{
    "enabled": true,
    "credits_per_rating": 5,
    "credits_per_detailed_rating": 10,
    "costs": {
      "extra_quote": 20,
      "ai_analysis": 50,
      "advanced_report": 30
    },
    "levels": {
      "bronze": { "min": 0, "max": 99, "multiplier": 1.0, "name": "Bronze" },
      "silver": { "min": 100, "max": 299, "multiplier": 1.1, "name": "Prata" },
      "gold": { "min": 300, "max": 599, "multiplier": 1.25, "name": "Ouro" },
      "diamond": { "min": 600, "multiplier": 1.5, "name": "Diamante" }
    }
  }'::jsonb,
  'Configuração do sistema de gamificação e recompensas'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- 6. Função para calcular nível baseado em créditos ganhos
CREATE OR REPLACE FUNCTION public.calculate_user_level(total_earned_credits INTEGER)
RETURNS TABLE(level_name TEXT, level_multiplier NUMERIC) AS $$
DECLARE
  config JSONB;
BEGIN
  -- Buscar configuração
  SELECT setting_value INTO config
  FROM public.system_settings
  WHERE setting_key = 'gamification_config';
  
  -- Diamante (600+)
  IF total_earned_credits >= 600 THEN
    RETURN QUERY SELECT 'diamond'::TEXT, 1.5::NUMERIC;
  -- Ouro (300-599)
  ELSIF total_earned_credits >= 300 THEN
    RETURN QUERY SELECT 'gold'::TEXT, 1.25::NUMERIC;
  -- Prata (100-299)
  ELSIF total_earned_credits >= 100 THEN
    RETURN QUERY SELECT 'silver'::TEXT, 1.1::NUMERIC;
  -- Bronze (0-99)
  ELSE
    RETURN QUERY SELECT 'bronze'::TEXT, 1.0::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Modificar trigger check_and_grant_achievements para respeitar configurações
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_rating_count INTEGER;
  detailed_rating_count INTEGER;
  user_client_id UUID;
  config JSONB;
  system_enabled BOOLEAN;
  credits_amount INTEGER;
  new_level TEXT;
  new_multiplier NUMERIC;
BEGIN
  -- Buscar configuração do sistema de gamificação
  SELECT setting_value INTO config
  FROM public.system_settings
  WHERE setting_key = 'gamification_config';
  
  system_enabled := COALESCE((config->>'enabled')::boolean, false);
  
  -- Obter client_id do usuário
  SELECT client_id INTO user_client_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Contar avaliações do usuário
  SELECT COUNT(*) INTO user_rating_count
  FROM public.supplier_ratings
  WHERE client_id = NEW.client_id
  AND user_id = auth.uid();

  -- 🌟 Primeira Avaliação
  IF user_rating_count = 1 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name, 
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      auth.uid(), user_client_id, 'primeira_avaliacao', 
      'Primeira Avaliação', '🌟',
      'Você fez sua primeira avaliação de fornecedor!',
      1, 1
    ) ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 💬 Avaliador Ativo (5+)
  IF user_rating_count >= 5 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name, 
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      auth.uid(), user_client_id, 'avaliador_ativo_5', 
      'Avaliador Ativo', '💬',
      'Você já fez 5 avaliações! Continue assim!',
      user_rating_count, 5
    ) ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
      progress = user_rating_count, 
      earned_at = CASE WHEN user_achievements.earned_at IS NULL THEN now() ELSE user_achievements.earned_at END;
  END IF;

  -- 🏆 Expert em Feedback (20+)
  IF user_rating_count >= 20 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name, 
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      auth.uid(), user_client_id, 'expert_feedback_20', 
      'Expert em Feedback', '🏆',
      'Incrível! Você já fez 20 avaliações e ajuda muito a comunidade!',
      user_rating_count, 20
    ) ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
      progress = user_rating_count,
      earned_at = CASE WHEN user_achievements.earned_at IS NULL THEN now() ELSE user_achievements.earned_at END;
  END IF;

  -- 📝 Crítico Detalhista (10+ com comentários longos)
  SELECT COUNT(*) INTO detailed_rating_count
  FROM public.supplier_ratings
  WHERE client_id = NEW.client_id
  AND user_id = auth.uid()
  AND LENGTH(COALESCE(comments, '')) > 50;

  IF detailed_rating_count >= 10 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name, 
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      auth.uid(), user_client_id, 'critico_detalhista_10', 
      'Crítico Detalhista', '📝',
      'Suas avaliações detalhadas ajudam muito outros clientes!',
      detailed_rating_count, 10
    ) ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
      progress = detailed_rating_count,
      earned_at = CASE WHEN user_achievements.earned_at IS NULL THEN now() ELSE user_achievements.earned_at END;
  END IF;

  -- ============================================
  -- SISTEMA DE CRÉDITOS (se habilitado)
  -- ============================================
  IF system_enabled THEN
    -- Determinar quantidade de créditos
    IF LENGTH(COALESCE(NEW.comments, '')) > 50 THEN
      credits_amount := COALESCE((config->>'credits_per_detailed_rating')::integer, 10);
    ELSE
      credits_amount := COALESCE((config->>'credits_per_rating')::integer, 5);
    END IF;
    
    -- Adicionar créditos ao usuário
    INSERT INTO public.user_credits (user_id, client_id, available_credits, total_earned)
    VALUES (auth.uid(), user_client_id, credits_amount, credits_amount)
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
      available_credits = user_credits.available_credits + credits_amount,
      total_earned = user_credits.total_earned + credits_amount,
      updated_at = now();
    
    -- Recalcular nível baseado no total_earned atualizado
    SELECT level_name, level_multiplier INTO new_level, new_multiplier
    FROM public.calculate_user_level(
      (SELECT total_earned FROM public.user_credits WHERE user_id = auth.uid() AND client_id = user_client_id)
    );
    
    -- Atualizar nível e multiplicador
    UPDATE public.user_credits
    SET 
      current_level = new_level,
      level_multiplier = new_multiplier,
      updated_at = now()
    WHERE user_id = auth.uid() AND client_id = user_client_id;
    
    -- Registrar transação
    INSERT INTO public.credit_transactions (user_id, amount, reason, reference_id, metadata)
    VALUES (
      auth.uid(), 
      credits_amount, 
      'rating_submitted', 
      NEW.id::text,
      jsonb_build_object(
        'quote_id', NEW.quote_id,
        'supplier_id', NEW.supplier_id,
        'is_detailed', LENGTH(COALESCE(NEW.comments, '')) > 50
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Função para ajustar créditos manualmente (admin)
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_client_id UUID;
  new_level TEXT;
  new_multiplier NUMERIC;
BEGIN
  -- Só admins podem executar
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Somente administradores podem ajustar créditos';
  END IF;
  
  -- Obter client_id do usuário
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Atualizar créditos
  IF p_amount > 0 THEN
    -- Adicionar créditos
    INSERT INTO public.user_credits (user_id, client_id, available_credits, total_earned)
    VALUES (p_user_id, v_client_id, p_amount, p_amount)
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
      available_credits = user_credits.available_credits + p_amount,
      total_earned = user_credits.total_earned + p_amount,
      updated_at = now();
  ELSE
    -- Remover créditos
    UPDATE public.user_credits
    SET 
      available_credits = GREATEST(0, available_credits + p_amount),
      total_spent = total_spent + ABS(p_amount),
      updated_at = now()
    WHERE user_id = p_user_id AND client_id = v_client_id;
  END IF;
  
  -- Recalcular nível
  SELECT level_name, level_multiplier INTO new_level, new_multiplier
  FROM public.calculate_user_level(
    (SELECT total_earned FROM public.user_credits WHERE user_id = p_user_id AND client_id = v_client_id)
  );
  
  UPDATE public.user_credits
  SET 
    current_level = new_level,
    level_multiplier = new_multiplier,
    updated_at = now()
  WHERE user_id = p_user_id AND client_id = v_client_id;
  
  -- Registrar transação
  INSERT INTO public.credit_transactions (user_id, amount, reason, reference_id, metadata)
  VALUES (
    p_user_id, 
    p_amount, 
    p_reason, 
    'admin_manual_adjustment',
    jsonb_build_object('adjusted_by', auth.uid())
  );
  
  -- Log de auditoria
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
  VALUES (
    auth.uid(),
    'ADMIN_ADJUST_CREDITS',
    'user_credits',
    p_user_id::text,
    'admin',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'amount', p_amount,
      'reason', p_reason
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Função para resetar sistema de gamificação (admin)
CREATE OR REPLACE FUNCTION public.admin_reset_gamification()
RETURNS VOID AS $$
BEGIN
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Somente administradores podem resetar o sistema';
  END IF;
  
  -- Deletar todos os dados de gamificação
  TRUNCATE TABLE public.user_credits CASCADE;
  TRUNCATE TABLE public.credit_transactions CASCADE;
  TRUNCATE TABLE public.user_achievements CASCADE;
  
  -- Log de auditoria
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
  VALUES (
    auth.uid(),
    'ADMIN_RESET_GAMIFICATION',
    'system',
    'gamification_system',
    'admin',
    jsonb_build_object('action', 'full_reset', 'timestamp', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_client_id ON public.user_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_level ON public.user_credits(current_level);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reason ON public.credit_transactions(reason);