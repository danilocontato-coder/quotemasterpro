-- ============================================
-- SISTEMA DE GAMIFICAÇÃO COM DATABASE TRIGGERS
-- ============================================

-- Índice para performance nas queries de contagem
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_rater_id 
ON public.supplier_ratings(rater_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_type 
ON public.user_achievements(user_id, achievement_type);

-- ============================================
-- FUNÇÃO: Conceder Primeira Avaliação
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_first_rating_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rating_count INTEGER;
  user_client_id UUID;
BEGIN
  -- Buscar client_id do usuário
  SELECT client_id INTO user_client_id
  FROM public.profiles
  WHERE id = NEW.rater_id;

  -- Contar total de avaliações do usuário
  SELECT COUNT(*) INTO rating_count
  FROM public.supplier_ratings
  WHERE rater_id = NEW.rater_id;

  -- 🌟 Primeira Avaliação
  IF rating_count = 1 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name,
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      NEW.rater_id, user_client_id, 'primeira_avaliacao',
      'Primeira Avaliação', '🌟',
      'Você fez sua primeira avaliação de fornecedor!',
      1, 1
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 💬 Avaliador Ativo (5 avaliações)
  IF rating_count = 5 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name,
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      NEW.rater_id, user_client_id, 'avaliador_ativo_5',
      'Avaliador Ativo', '💬',
      'Você já fez 5 avaliações! Continue assim!',
      5, 5
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 🏆 Expert em Feedback (20 avaliações)
  IF rating_count = 20 THEN
    INSERT INTO public.user_achievements (
      user_id, client_id, achievement_type, achievement_name,
      achievement_icon, achievement_description, progress, progress_max
    ) VALUES (
      NEW.rater_id, user_client_id, 'expert_feedback_20',
      'Expert em Feedback', '🏆',
      'Incrível! Você já fez 20 avaliações e ajuda muito a comunidade!',
      20, 20
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 📝 Crítico Detalhista (verificar se tem 10+ avaliações detalhadas)
  IF LENGTH(COALESCE(NEW.comments, '')) > 100 THEN
    DECLARE
      detailed_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO detailed_count
      FROM public.supplier_ratings
      WHERE rater_id = NEW.rater_id
        AND LENGTH(COALESCE(comments, '')) > 100;

      IF detailed_count = 10 THEN
        INSERT INTO public.user_achievements (
          user_id, client_id, achievement_type, achievement_name,
          achievement_icon, achievement_description, progress, progress_max
        ) VALUES (
          NEW.rater_id, user_client_id, 'critico_detalhista_10',
          'Crítico Detalhista', '📝',
          'Suas avaliações detalhadas ajudam muito outros clientes!',
          10, 10
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: Após inserir avaliação
-- ============================================
DROP TRIGGER IF EXISTS trigger_grant_achievements ON public.supplier_ratings;

CREATE TRIGGER trigger_grant_achievements
  AFTER INSERT ON public.supplier_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_first_rating_achievement();

-- ============================================
-- SCRIPT RETROATIVO: Conceder conquistas para avaliações existentes
-- ============================================

-- Primeira Avaliação (para quem já avaliou mas não tem a conquista)
INSERT INTO public.user_achievements (
  user_id, client_id, achievement_type, achievement_name,
  achievement_icon, achievement_description, progress, progress_max, earned_at
)
SELECT DISTINCT ON (sr.rater_id)
  sr.rater_id,
  sr.client_id,
  'primeira_avaliacao',
  'Primeira Avaliação',
  '🌟',
  'Você fez sua primeira avaliação de fornecedor!',
  1,
  1,
  MIN(sr.created_at) OVER (PARTITION BY sr.rater_id)
FROM public.supplier_ratings sr
WHERE sr.rater_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements ua
    WHERE ua.user_id = sr.rater_id
      AND ua.achievement_type = 'primeira_avaliacao'
  )
ORDER BY sr.rater_id, sr.created_at ASC
ON CONFLICT (user_id, achievement_type) DO NOTHING;

-- Avaliador Ativo (5+)
WITH rating_counts AS (
  SELECT 
    sr.rater_id,
    sr.client_id,
    COUNT(*) as rating_count,
    MAX(sr.created_at) as last_rating_date
  FROM public.supplier_ratings sr
  WHERE sr.rater_id IS NOT NULL
  GROUP BY sr.rater_id, sr.client_id
  HAVING COUNT(*) >= 5
)
INSERT INTO public.user_achievements (
  user_id, client_id, achievement_type, achievement_name,
  achievement_icon, achievement_description, progress, progress_max, earned_at
)
SELECT 
  rc.rater_id,
  rc.client_id,
  'avaliador_ativo_5',
  'Avaliador Ativo',
  '💬',
  'Você já fez 5 avaliações! Continue assim!',
  rc.rating_count,
  5,
  rc.last_rating_date
FROM rating_counts rc
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_achievements ua
  WHERE ua.user_id = rc.rater_id
    AND ua.achievement_type = 'avaliador_ativo_5'
)
ON CONFLICT (user_id, achievement_type) DO NOTHING;

-- Expert em Feedback (20+)
WITH rating_counts AS (
  SELECT 
    sr.rater_id,
    sr.client_id,
    COUNT(*) as rating_count,
    MAX(sr.created_at) as last_rating_date
  FROM public.supplier_ratings sr
  WHERE sr.rater_id IS NOT NULL
  GROUP BY sr.rater_id, sr.client_id
  HAVING COUNT(*) >= 20
)
INSERT INTO public.user_achievements (
  user_id, client_id, achievement_type, achievement_name,
  achievement_icon, achievement_description, progress, progress_max, earned_at
)
SELECT 
  rc.rater_id,
  rc.client_id,
  'expert_feedback_20',
  'Expert em Feedback',
  '🏆',
  'Incrível! Você já fez 20 avaliações e ajuda muito a comunidade!',
  rc.rating_count,
  20,
  rc.last_rating_date
FROM rating_counts rc
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_achievements ua
  WHERE ua.user_id = rc.rater_id
    AND ua.achievement_type = 'expert_feedback_20'
)
ON CONFLICT (user_id, achievement_type) DO NOTHING;

-- Crítico Detalhista (10+ avaliações com comentários longos)
WITH detailed_ratings AS (
  SELECT 
    sr.rater_id,
    sr.client_id,
    COUNT(*) as detailed_count,
    MAX(sr.created_at) as last_rating_date
  FROM public.supplier_ratings sr
  WHERE sr.rater_id IS NOT NULL
    AND LENGTH(COALESCE(sr.comments, '')) > 100
  GROUP BY sr.rater_id, sr.client_id
  HAVING COUNT(*) >= 10
)
INSERT INTO public.user_achievements (
  user_id, client_id, achievement_type, achievement_name,
  achievement_icon, achievement_description, progress, progress_max, earned_at
)
SELECT 
  dr.rater_id,
  dr.client_id,
  'critico_detalhista_10',
  'Crítico Detalhista',
  '📝',
  'Suas avaliações detalhadas ajudam muito outros clientes!',
  dr.detailed_count,
  10,
  dr.last_rating_date
FROM detailed_ratings dr
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_achievements ua
  WHERE ua.user_id = dr.rater_id
    AND ua.achievement_type = 'critico_detalhista_10'
)
ON CONFLICT (user_id, achievement_type) DO NOTHING;