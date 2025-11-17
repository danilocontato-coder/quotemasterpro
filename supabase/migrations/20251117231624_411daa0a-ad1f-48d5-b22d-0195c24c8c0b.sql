-- Política RLS para delivery_confirmations: bloquear fornecedores de acessar códigos
-- Apenas clientes podem ver seus códigos, fornecedores NÃO podem

-- Garantir que RLS está habilitado
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Suppliers can view delivery confirmations" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Users can view delivery confirmations" ON public.delivery_confirmations;

-- Política: Clientes podem ver códigos de suas próprias entregas
CREATE POLICY "Clients can view their own delivery confirmation codes"
ON public.delivery_confirmations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    INNER JOIN public.payments p ON p.quote_id = d.quote_id
    INNER JOIN public.profiles prof ON prof.client_id = p.client_id
    WHERE d.id = delivery_confirmations.delivery_id
    AND prof.id = auth.uid()
  )
);

-- Política: Service role pode fazer tudo (para edge functions)
CREATE POLICY "Service role can manage all delivery confirmations"
ON public.delivery_confirmations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- IMPORTANTE: Fornecedores NÃO terão nenhuma política que permite ver confirmation_code
-- Isso garante que eles não possam acessar os códigos de confirmação