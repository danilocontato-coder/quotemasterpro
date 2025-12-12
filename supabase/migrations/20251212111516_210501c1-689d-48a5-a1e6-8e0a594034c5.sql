-- =====================================================
-- Proteção RLS para tabelas de templates públicas
-- Estas tabelas estavam acessíveis sem autenticação
-- =====================================================

-- 1. Proteger categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'categories_require_auth'
    ) THEN
        CREATE POLICY "categories_require_auth"
        ON public.categories FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 2. Proteger email_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_templates' 
        AND policyname = 'email_templates_require_auth'
    ) THEN
        CREATE POLICY "email_templates_require_auth"
        ON public.email_templates FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 3. Proteger email_templates_library
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_templates_library' 
        AND policyname = 'email_templates_library_require_auth'
    ) THEN
        CREATE POLICY "email_templates_library_require_auth"
        ON public.email_templates_library FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 4. Proteger payment_condition_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_condition_templates' 
        AND policyname = 'payment_condition_templates_require_auth'
    ) THEN
        CREATE POLICY "payment_condition_templates_require_auth"
        ON public.payment_condition_templates FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 5. Proteger decision_matrix_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'decision_matrix_templates' 
        AND policyname = 'decision_matrix_templates_require_auth'
    ) THEN
        CREATE POLICY "decision_matrix_templates_require_auth"
        ON public.decision_matrix_templates FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Comentários explicativos
COMMENT ON POLICY "categories_require_auth" ON public.categories IS 'Requer autenticação para visualizar categorias - segurança contra exposição de dados de negócio';
COMMENT ON POLICY "email_templates_require_auth" ON public.email_templates IS 'Requer autenticação para visualizar templates de email';
COMMENT ON POLICY "email_templates_library_require_auth" ON public.email_templates_library IS 'Requer autenticação para visualizar biblioteca de templates';
COMMENT ON POLICY "payment_condition_templates_require_auth" ON public.payment_condition_templates IS 'Requer autenticação para visualizar templates de condições de pagamento';
COMMENT ON POLICY "decision_matrix_templates_require_auth" ON public.decision_matrix_templates IS 'Requer autenticação para visualizar templates de matriz de decisão';