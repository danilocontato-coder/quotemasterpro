-- RECRIAR POLÍTICAS RLS SEGURAS para as tabelas sem políticas

-- 1. QUOTE_ITEMS - Políticas baseadas em client_id
CREATE POLICY "quote_items_client_select" 
ON public.quote_items 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin' OR
  current_user_can_see_quote(quote_id)
);

CREATE POLICY "quote_items_client_insert" 
ON public.quote_items 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_items_client_update" 
ON public.quote_items 
FOR UPDATE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_items_client_delete" 
ON public.quote_items 
FOR DELETE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 2. AI_NEGOTIATIONS - Políticas baseadas em client_id
CREATE POLICY "ai_negotiations_client_select" 
ON public.ai_negotiations 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "ai_negotiations_client_insert" 
ON public.ai_negotiations 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "ai_negotiations_client_update" 
ON public.ai_negotiations 
FOR UPDATE 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 3. QUOTE_TOKENS - Políticas baseadas em client_id
CREATE POLICY "quote_tokens_client_select" 
ON public.quote_tokens 
FOR SELECT 
USING (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

CREATE POLICY "quote_tokens_client_insert" 
ON public.quote_tokens 
FOR INSERT 
WITH CHECK (
  client_id = get_current_user_client_id() OR
  get_user_role() = 'admin'
);

-- 4. USER_SETTINGS - Políticas baseadas em user_id e client_id
CREATE POLICY "user_settings_own_select" 
ON public.user_settings 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  (client_id = get_current_user_client_id() AND get_user_role() IN ('admin', 'manager')) OR
  get_user_role() = 'admin'
);

CREATE POLICY "user_settings_own_insert" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  (client_id = get_current_user_client_id() OR get_user_role() = 'admin')
);

CREATE POLICY "user_settings_own_update" 
ON public.user_settings 
FOR UPDATE 
USING (
  user_id = auth.uid() AND
  (client_id = get_current_user_client_id() OR get_user_role() = 'admin')
);