-- ============================================
-- FASE 2 + 5: Preparar Sistema de Termos de Uso (CORRIGIDO v2)
-- ============================================
-- Esta migration prepara o sistema para exigir aceitação de termos
-- ANTES de bloquear qualquer usuário existente

-- 1) Aceitar termos automaticamente para usuários existentes
-- (consideramos que já aceitaram implicitamente ao usar a plataforma)
UPDATE profiles
SET 
  terms_accepted = true,
  terms_accepted_at = now(),
  updated_at = now()
WHERE 
  created_at < '2025-10-28'  -- Data de implementação
  AND terms_accepted = false
  AND active = true;

-- 2) Criar/atualizar configuração de feature flag (DESATIVADA por padrão)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'terms_feature_flags',
  jsonb_build_object(
    'enforce_terms', false,
    'implemented_at', now(),
    'version', '1.0'
  ),
  'Controle de ativação do sistema de termos de uso'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = jsonb_build_object(
    'enforce_terms', false,
    'implemented_at', now(),
    'version', '1.0'
  ),
  updated_at = now();

-- 3) Registrar na auditoria
INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
VALUES (
  'TERMS_SYSTEM_PREPARED',
  'system_settings',
  'terms_feature_flags',
  'system',
  jsonb_build_object(
    'phase', 'migration_phase_2_and_5',
    'existing_users_accepted', (
      SELECT COUNT(*) 
      FROM profiles 
      WHERE terms_accepted = true 
      AND terms_accepted_at > now() - interval '1 minute'
    ),
    'feature_flag_status', 'disabled',
    'reason', 'Preparação segura antes de ativar bloqueio',
    'timestamp', now()
  )
);

-- 4) Comentário para rollback de emergência
COMMENT ON COLUMN profiles.terms_accepted IS 
'ROLLBACK DE EMERGÊNCIA: UPDATE profiles SET terms_accepted = true WHERE active = true;';

COMMENT ON TABLE system_settings IS
'ROLLBACK DE EMERGÊNCIA: UPDATE system_settings SET setting_value = jsonb_set(setting_value, ''{enforce_terms}'', ''false''::jsonb) WHERE setting_key = ''terms_feature_flags'';';