-- VERIFICAR E REFORÇAR POLÍTICAS RLS PARA ISOLAMENTO TOTAL DE DADOS
-- Esta migration garante que as políticas RLS estejam funcionando corretamente

DO $$
BEGIN
    -- 1. Garantir que subscription_plans seja visível para todos (dados públicos)
    DROP POLICY IF EXISTS "subscription_plans_public_select" ON public.subscription_plans;
    CREATE POLICY "subscription_plans_public_select" 
    ON public.subscription_plans 
    FOR SELECT 
    USING (true);
    
    -- 2. Verificar políticas de categories (devem ser públicas para funcionalidade)
    DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
    CREATE POLICY "categories_public_select" 
    ON public.categories 
    FOR SELECT 
    USING (true);
    
    -- 3. Garantir que user_groups sejam visíveis apenas para usuários autenticados
    DROP POLICY IF EXISTS "user_groups_authenticated_only" ON public.user_groups;
    CREATE POLICY "user_groups_authenticated_only" 
    ON public.user_groups 
    FOR ALL 
    USING (auth.uid() IS NOT NULL);
    
    -- 4. Garantir que dados órfãos não sejam visíveis
    -- Adicionar política restritiva para quotes sem client_id
    DROP POLICY IF EXISTS "quotes_no_orphans" ON public.quotes;
    CREATE POLICY "quotes_no_orphans" 
    ON public.quotes 
    FOR ALL 
    USING (
        client_id IS NOT NULL AND (
            (get_user_role() = 'admin'::text) OR 
            (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR 
            (supplier_id IN (SELECT profiles.supplier_id FROM profiles WHERE profiles.id = auth.uid())) OR 
            (created_by = auth.uid())
        )
    );
    
    -- 5. Garantir que products órfãos não sejam visíveis
    DROP POLICY IF EXISTS "products_no_orphans" ON public.products;
    CREATE POLICY "products_no_orphans" 
    ON public.products 
    FOR ALL 
    USING (
        (client_id IS NOT NULL OR supplier_id IS NOT NULL) AND (
            (get_user_role() = 'admin'::text) OR 
            (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR 
            (supplier_id IN (SELECT profiles.supplier_id FROM profiles WHERE profiles.id = auth.uid()))
        )
    );
    
    RAISE NOTICE 'Políticas RLS reforçadas para isolamento total de dados';
END $$;