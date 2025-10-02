-- Aplicar RLS Policies com validação de módulos em todas as tabelas principais

-- ====================================
-- MÓDULO: quotes
-- ====================================

-- Quotes: adicionar validação de módulo nas policies existentes
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy"
ON public.quotes
FOR SELECT
USING (
  user_has_module_access('quotes')
  AND current_user_can_see_quote(id)
);

DROP POLICY IF EXISTS "quotes_insert_simple" ON public.quotes;
CREATE POLICY "quotes_insert_simple"
ON public.quotes
FOR INSERT
WITH CHECK (
  user_has_module_access('quotes')
  AND auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND client_id IS NOT NULL
  AND client_id = get_current_user_client_id()
);

DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
CREATE POLICY "quotes_update_policy"
ON public.quotes
FOR UPDATE
USING (
  user_has_module_access('quotes')
  AND (
    get_user_role() = 'admin'
    OR (
      client_id = get_current_user_client_id()
      AND created_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;
CREATE POLICY "quotes_delete_policy"
ON public.quotes
FOR DELETE
USING (
  user_has_module_access('quotes')
  AND (
    get_user_role() = 'admin'
    OR (
      client_id = get_current_user_client_id()
      AND created_by = auth.uid()
    )
  )
);

-- Quote Items: adicionar validação de módulo
DROP POLICY IF EXISTS "quote_items_client_select" ON public.quote_items;
CREATE POLICY "quote_items_client_select"
ON public.quote_items
FOR SELECT
USING (
  user_has_module_access('quotes')
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
    OR current_user_can_see_quote(quote_id)
  )
);

DROP POLICY IF EXISTS "quote_items_client_insert" ON public.quote_items;
CREATE POLICY "quote_items_client_insert"
ON public.quote_items
FOR INSERT
WITH CHECK (
  user_has_module_access('quotes')
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "quote_items_client_update" ON public.quote_items;
CREATE POLICY "quote_items_client_update"
ON public.quote_items
FOR UPDATE
USING (
  user_has_module_access('quotes')
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "quote_items_client_delete" ON public.quote_items;
CREATE POLICY "quote_items_client_delete"
ON public.quote_items
FOR DELETE
USING (
  user_has_module_access('quotes')
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

-- ====================================
-- MÓDULO: payments
-- ====================================

DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select"
ON public.payments
FOR SELECT
USING (
  user_has_module_access('payments')
  AND (
    get_user_role() = 'admin'
    OR client_id = get_current_user_client_id()
    OR supplier_id = get_current_user_supplier_id()
  )
);

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert"
ON public.payments
FOR INSERT
WITH CHECK (
  user_has_module_access('payments')
  AND (
    get_user_role() = 'admin'
    OR client_id = get_current_user_client_id()
  )
);

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update"
ON public.payments
FOR UPDATE
USING (
  user_has_module_access('payments')
  AND (
    get_user_role() = 'admin'
    OR client_id = get_current_user_client_id()
  )
);

-- ====================================
-- MÓDULO: approvals
-- ====================================

DROP POLICY IF EXISTS "approvals_select" ON public.approvals;
CREATE POLICY "approvals_select"
ON public.approvals
FOR SELECT
USING (
  user_has_module_access('approvals')
  AND (
    get_user_role() = 'admin'
    OR approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = approvals.quote_id
        AND q.client_id = get_current_user_client_id()
    )
  )
);

DROP POLICY IF EXISTS "approvals_insert" ON public.approvals;
CREATE POLICY "approvals_insert"
ON public.approvals
FOR INSERT
WITH CHECK (
  user_has_module_access('approvals')
  AND (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.client_id IN (
          SELECT quotes.client_id
          FROM quotes
          WHERE quotes.id = approvals.quote_id
        )
    )
  )
);

DROP POLICY IF EXISTS "approvals_update" ON public.approvals;
CREATE POLICY "approvals_update"
ON public.approvals
FOR UPDATE
USING (
  user_has_module_access('approvals')
  AND (
    get_user_role() = 'admin'
    OR approver_id = auth.uid()
  )
);

-- ====================================
-- MÓDULO: delivery_management (requer payments também)
-- ====================================

-- Remover todas as policies antigas de delivery_confirmations
DROP POLICY IF EXISTS "Admins podem tudo" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Clientes podem ver códigos de suas entregas" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Clientes podem confirmar códigos" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Fornecedores podem ver códigos de suas entregas" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Sistema pode inserir códigos" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "delivery_confirmations_admin" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "delivery_confirmations_client_select" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "delivery_confirmations_client_update" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "delivery_confirmations_supplier_select" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "delivery_confirmations_system_insert" ON public.delivery_confirmations;

-- Criar policies novas com validação de módulo
CREATE POLICY "delivery_confirmations_admin"
ON public.delivery_confirmations
FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "delivery_confirmations_client_select"
ON public.delivery_confirmations
FOR SELECT
USING (
  user_has_all_modules_access(ARRAY['payments', 'delivery_management'])
  AND EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
      AND d.client_id = get_current_user_client_id()
  )
);

CREATE POLICY "delivery_confirmations_client_update"
ON public.delivery_confirmations
FOR UPDATE
USING (
  user_has_all_modules_access(ARRAY['payments', 'delivery_management'])
  AND EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
      AND d.client_id = get_current_user_client_id()
  )
);

CREATE POLICY "delivery_confirmations_supplier_select"
ON public.delivery_confirmations
FOR SELECT
USING (
  user_has_all_modules_access(ARRAY['payments', 'delivery_management'])
  AND EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
      AND d.supplier_id = get_current_user_supplier_id()
  )
);

CREATE POLICY "delivery_confirmations_system_insert"
ON public.delivery_confirmations
FOR INSERT
WITH CHECK (
  user_has_all_modules_access(ARRAY['payments', 'delivery_management'])
);

-- ====================================
-- MÓDULO: ai_negotiation (requer quotes + ai_negotiation)
-- ====================================

DROP POLICY IF EXISTS "ai_negotiations_client_select" ON public.ai_negotiations;
CREATE POLICY "ai_negotiations_client_select"
ON public.ai_negotiations
FOR SELECT
USING (
  user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation'])
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "ai_negotiations_client_insert" ON public.ai_negotiations;
CREATE POLICY "ai_negotiations_client_insert"
ON public.ai_negotiations
FOR INSERT
WITH CHECK (
  user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation'])
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "ai_negotiations_client_update" ON public.ai_negotiations;
CREATE POLICY "ai_negotiations_client_update"
ON public.ai_negotiations
FOR UPDATE
USING (
  user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation'])
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

-- ====================================
-- MÓDULO: suppliers
-- ====================================

DROP POLICY IF EXISTS "suppliers_client_view" ON public.suppliers;
CREATE POLICY "suppliers_client_view"
ON public.suppliers
FOR SELECT
USING (
  user_has_module_access('suppliers')
  AND get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
      AND cs.status = 'active'
  )
);

DROP POLICY IF EXISTS "suppliers_client_insert" ON public.suppliers;
CREATE POLICY "suppliers_client_insert"
ON public.suppliers
FOR INSERT
WITH CHECK (
  user_has_module_access('suppliers')
  AND auth.uid() IS NOT NULL
  AND (
    client_id = get_current_user_client_id()
    OR get_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "suppliers_client_edit" ON public.suppliers;
CREATE POLICY "suppliers_client_edit"
ON public.suppliers
FOR UPDATE
USING (
  user_has_module_access('suppliers')
  AND get_current_user_client_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
      AND cs.client_id = get_current_user_client_id()
  )
)
WITH CHECK (
  user_has_module_access('suppliers')
  AND get_current_user_client_id() IS NOT NULL
);

-- Comentários explicativos
COMMENT ON POLICY "quotes_select_policy" ON public.quotes IS 
'Permite SELECT apenas para usuários com módulo quotes habilitado';

COMMENT ON POLICY "payments_select" ON public.payments IS 
'Permite SELECT apenas para usuários com módulo payments habilitado';

COMMENT ON POLICY "approvals_select" ON public.approvals IS 
'Permite SELECT apenas para usuários com módulo approvals habilitado';

COMMENT ON POLICY "delivery_confirmations_client_select" ON public.delivery_confirmations IS 
'Requer módulos payments E delivery_management habilitados';

COMMENT ON POLICY "ai_negotiations_client_select" ON public.ai_negotiations IS 
'Requer módulos quotes E ai_negotiation habilitados';

COMMENT ON POLICY "suppliers_client_view" ON public.suppliers IS 
'Permite SELECT apenas para usuários com módulo suppliers habilitado';