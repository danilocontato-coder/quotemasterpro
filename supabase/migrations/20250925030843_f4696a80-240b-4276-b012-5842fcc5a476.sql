-- Remover políticas existentes da tabela deliveries se existir
DROP POLICY IF EXISTS "deliveries_supplier_access" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_client_access" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_admin_all" ON public.deliveries;

-- Recriar políticas RLS para deliveries com isolamento total entre clientes
CREATE POLICY "deliveries_admin_all" ON public.deliveries
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "deliveries_client_access" ON public.deliveries
  FOR ALL USING (
    client_id IN (
      SELECT profiles.client_id 
      FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT profiles.client_id 
      FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "deliveries_supplier_access" ON public.deliveries
  FOR ALL USING (
    supplier_id = get_current_user_supplier_id()
  )
  WITH CHECK (
    supplier_id = get_current_user_supplier_id()
  );

-- Garantir que quote_responses também tenha isolamento total
DROP POLICY IF EXISTS "quote_responses_select_client" ON public.quote_responses;
CREATE POLICY "quote_responses_select_client" ON public.quote_responses
  FOR SELECT USING (
    get_user_role() = 'admin' OR
    -- Cliente só vê respostas de suas próprias cotações
    quote_id IN (
      SELECT id FROM public.quotes 
      WHERE client_id IN (
        SELECT profiles.client_id 
        FROM public.profiles 
        WHERE profiles.id = auth.uid()
      )
    ) OR
    -- Fornecedor só vê suas próprias respostas
    supplier_id = get_current_user_supplier_id()
  );