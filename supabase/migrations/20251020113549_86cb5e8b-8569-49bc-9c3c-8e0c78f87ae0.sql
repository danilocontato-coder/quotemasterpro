-- ================================================
-- CORREÇÃO: Remover análise automática de IA para evitar gasto desnecessário de tokens
-- ================================================

-- 1. Remover TODOS os triggers relacionados (usando CASCADE)
DROP TRIGGER IF EXISTS trg_quote_ai_negotiation ON public.quotes CASCADE;
DROP TRIGGER IF EXISTS trigger_ai_negotiation_on_quote_received ON public.quotes CASCADE;
DROP FUNCTION IF EXISTS public.trigger_ai_negotiation() CASCADE;

-- 2. Limpar registros de ai_negotiations criados prematuramente (última 24h)
DELETE FROM public.ai_negotiations 
WHERE status = 'analyzing' 
AND created_at > NOW() - INTERVAL '24 hours'
AND quote_id IN (
  SELECT id FROM public.quotes 
  WHERE status IN ('sent', 'receiving')
);

-- 3. Adicionar configuração de sistema para controle manual
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'ai_auto_analysis_enabled',
  '{"enabled": false, "trigger_on_deadline": false}'::jsonb,
  'Controla se análise de IA é acionada automaticamente. Requer ação manual do usuário por padrão para evitar gasto excessivo de tokens OpenAI.'
) ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = '{"enabled": false, "trigger_on_deadline": false}'::jsonb,
  description = 'Controla se análise de IA é acionada automaticamente. Requer ação manual do usuário por padrão para evitar gasto excessivo de tokens OpenAI.',
  updated_at = NOW();

-- 4. Audit log
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, panel_type, details)
VALUES (
  NULL,
  'SYSTEM_CONFIG_UPDATE',
  'ai_negotiations',
  'auto_trigger_disabled',
  'system',
  jsonb_build_object(
    'reason', 'Prevent unnecessary OpenAI token usage',
    'impact', 'AI analysis requires explicit manual trigger',
    'timestamp', NOW()
  )
);

COMMENT ON TABLE public.ai_negotiations IS 'AI negotiation analysis - MANUAL ONLY to control OpenAI costs';
