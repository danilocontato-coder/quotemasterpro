-- Criar tabela de conquistas de usuários
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_icon TEXT NOT NULL,
  achievement_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress INTEGER DEFAULT 0,
  progress_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Habilitar RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários veem suas conquistas"
ON public.user_achievements FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Sistema pode inserir conquistas"
ON public.user_achievements FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar conquistas"
ON public.user_achievements FOR UPDATE
USING (true);

-- Função para verificar e conceder conquistas
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
BEGIN
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

  RETURN NEW;
END;
$$;

-- Trigger para verificar conquistas após inserir avaliação
CREATE TRIGGER trg_check_achievements_on_rating
AFTER INSERT ON public.supplier_ratings
FOR EACH ROW EXECUTE FUNCTION public.check_and_grant_achievements();

-- Índices para performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON public.user_achievements(earned_at DESC);