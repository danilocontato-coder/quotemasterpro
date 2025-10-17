-- Correção do módulo de entregas: ajustar política RLS de delivery_confirmations

-- Remover política restritiva existente
DROP POLICY IF EXISTS delivery_confirmations_client_select ON public.delivery_confirmations;

-- Criar nova política mais simples (sem exigência de módulos combinados)
CREATE POLICY delivery_confirmations_client_select_v2
ON public.delivery_confirmations
FOR SELECT
USING (
  -- Cliente pode ver códigos de confirmação das suas entregas
  EXISTS (
    SELECT 1 
    FROM public.deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
    AND d.client_id = get_current_user_client_id()
  )
);