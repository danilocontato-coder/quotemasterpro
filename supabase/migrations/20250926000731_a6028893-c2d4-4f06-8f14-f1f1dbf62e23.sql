-- ATUALIZAR POLÍTICAS RLS para garantir total segregação

-- 1. QUOTE_ITEMS - Corrigir políticas para usar client_id
DROP POLICY IF EXISTS quote_items_insert ON public.quote_items;
DROP POLICY IF EXISTS quote_items_select ON public.quote_items;

CREATE POLICY "quote_items_secure_insert" 
ON public.quote_items 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_items_secure_select" 
ON public.quote_items 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin' OR
  current_user_can_see_quote(quote_id)
);

CREATE POLICY "quote_items_secure_update" 
ON public.quote_items 
FOR UPDATE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_items_secure_delete" 
ON public.quote_items 
FOR DELETE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 2. AI_NEGOTIATIONS - Corrigir políticas
DROP POLICY IF EXISTS ai_negotiations_insert ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_select ON public.ai_negotiations;
DROP POLICY IF EXISTS ai_negotiations_update ON public.ai_negotiations;

CREATE POLICY "ai_negotiations_secure_insert" 
ON public.ai_negotiations 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "ai_negotiations_secure_select" 
ON public.ai_negotiations 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "ai_negotiations_secure_update" 
ON public.ai_negotiations 
FOR UPDATE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 3. QUOTE_TOKENS - Corrigir políticas
DROP POLICY IF EXISTS quote_tokens_admin ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_insert_by_client ON public.quote_tokens;
DROP POLICY IF EXISTS quote_tokens_select_by_quote ON public.quote_tokens;

CREATE POLICY "quote_tokens_secure_select" 
ON public.quote_tokens 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_tokens_secure_insert" 
ON public.quote_tokens 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 4. USER_SETTINGS - Criar políticas seguras
CREATE POLICY "user_settings_secure_select" 
ON public.user_settings 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "user_settings_secure_insert" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  (client_id = get_current_user_client_id() OR get_user_role() = 'admin')
);

CREATE POLICY "user_settings_secure_update" 
ON public.user_settings 
FOR UPDATE 
USING (
  user_id = auth.uid() AND
  (client_id = get_current_user_client_id() OR get_user_role() = 'admin')
);