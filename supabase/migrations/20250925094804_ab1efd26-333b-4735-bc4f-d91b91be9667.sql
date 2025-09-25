-- Limpar dados de usuários com vínculos incorretos entre fornecedor e cliente
-- Isso corrige problemas de segurança onde usuários de fornecedores tinham acesso a dados de clientes

-- 1. Identificar e corrigir profiles com supplier_id que também têm client_id (violação de segurança)
UPDATE public.profiles 
SET 
  client_id = NULL,
  tenant_type = 'supplier',
  onboarding_completed = true,
  updated_at = now()
WHERE supplier_id IS NOT NULL AND client_id IS NOT NULL;

-- 2. Corrigir registros na tabela users que têm tanto supplier_id quanto client_id
UPDATE public.users 
SET 
  client_id = NULL,
  updated_at = now()
WHERE supplier_id IS NOT NULL AND client_id IS NOT NULL;

-- 3. Atualizar tenant_type para 'supplier' em profiles onde supplier_id existe mas tenant_type está como 'client'
UPDATE public.profiles 
SET 
  tenant_type = 'supplier',
  onboarding_completed = true,
  updated_at = now()
WHERE supplier_id IS NOT NULL AND tenant_type = 'client';

-- 4. Log de auditoria para rastrear essa limpeza de segurança
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'SECURITY_CLEANUP',
  'profiles',
  'bulk_update',
  'system',
  jsonb_build_object(
    'action', 'removed_cross_tenant_links',
    'reason', 'security_violation_fix',
    'timestamp', now()
  )
);