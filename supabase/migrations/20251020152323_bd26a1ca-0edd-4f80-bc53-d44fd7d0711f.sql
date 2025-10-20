-- =====================================================
-- MIGRATION: RLS Policies para Sistema de Aprovação Condomínios
-- =====================================================

-- 1. RLS Policy: Condomínios visualizam apenas suas cotações
CREATE POLICY "condominios_view_own_quotes" ON public.quotes
  FOR SELECT
  USING (
    client_id = get_current_user_client_id()
    OR on_behalf_of_client_id = get_current_user_client_id()
  );

-- 2. RLS Policy: Condomínios visualizam apenas suas aprovações
CREATE POLICY "condominios_view_own_approvals" ON public.approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = approvals.quote_id
      AND q.client_id = get_current_user_client_id()
    )
  );

-- 3. RLS Policy: Condomínios podem aprovar/rejeitar suas próprias aprovações
CREATE POLICY "condominios_update_own_approvals" ON public.approvals
  FOR UPDATE
  USING (
    approver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = approvals.quote_id
      AND q.client_id = get_current_user_client_id()
    )
  );

-- 4. RLS Policy: Condomínios gerenciam seus próprios níveis de aprovação
CREATE POLICY "condominios_manage_own_approval_levels" ON public.approval_levels
  FOR ALL
  USING (client_id = get_current_user_client_id())
  WITH CHECK (client_id = get_current_user_client_id());

-- 5. RLS Policy: Administradora visualiza cotações de condomínios vinculados
CREATE POLICY "administradora_view_condominio_quotes" ON public.quotes
  FOR SELECT
  USING (
    on_behalf_of_client_id = get_current_user_client_id()
    OR (
      client_id IN (
        SELECT c.id FROM clients c
        WHERE c.parent_client_id = get_current_user_client_id()
      )
    )
  );

-- 6. RLS Policy: Administradora visualiza aprovações de condomínios vinculados
CREATE POLICY "administradora_view_condominio_approvals" ON public.approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = approvals.quote_id
      AND (
        q.on_behalf_of_client_id = get_current_user_client_id()
        OR q.client_id IN (
          SELECT c.id FROM clients c
          WHERE c.parent_client_id = get_current_user_client_id()
        )
      )
    )
  );

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_on_behalf_of_client_id ON public.quotes(on_behalf_of_client_id);
CREATE INDEX IF NOT EXISTS idx_approvals_quote_id ON public.approvals(quote_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON public.approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_levels_client_id ON public.approval_levels(client_id);

-- 8. Comentários explicativos
COMMENT ON POLICY "condominios_view_own_quotes" ON public.quotes IS 
  'Permite que condomínios visualizem cotações onde são o cliente ou onde foram criadas em nome deles';

COMMENT ON POLICY "condominios_update_own_approvals" ON public.approvals IS 
  'Permite que aprovadores de condomínios aprovem/rejeitem apenas suas aprovações';

COMMENT ON POLICY "administradora_view_condominio_quotes" ON public.quotes IS 
  'Permite que administradora visualize cotações de condomínios vinculados';

COMMENT ON POLICY "administradora_view_condominio_approvals" ON public.approvals IS 
  'Permite que administradora visualize aprovações de condomínios vinculados';