-- Atualizar função current_user_can_see_quote para incluir verificação em quote_suppliers
CREATE OR REPLACE FUNCTION public.current_user_can_see_quote(quote_id_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_client_id uuid;
    user_supplier_id uuid;
    quote_client_id uuid;
    quote_supplier_id uuid;
    quote_selected_suppliers uuid[];
    invited_via_link boolean := false;
BEGIN
    -- Bloquear anônimos
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Dados do usuário
    SELECT COALESCE(p.role, 'anonymous'), p.client_id, p.supplier_id
    INTO user_role, user_client_id, user_supplier_id
    FROM profiles p
    WHERE p.id = auth.uid();

    -- Admin vê tudo
    IF user_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Dados da cotação
    SELECT q.client_id, q.supplier_id, q.selected_supplier_ids
    INTO quote_client_id, quote_supplier_id, quote_selected_suppliers
    FROM quotes q
    WHERE q.id = quote_id_param;

    IF quote_client_id IS NULL THEN
        RETURN false;
    END IF;

    -- Cliente do próprio cliente
    IF user_client_id IS NOT NULL AND user_client_id = quote_client_id THEN
        RETURN true;
    END IF;

    -- Fornecedor com relacionamento
    IF user_supplier_id IS NOT NULL THEN
        -- 1) Atribuído direto na cotação
        IF quote_supplier_id = user_supplier_id THEN
            RETURN true;
        END IF;

        -- 2) Está listado em selected_supplier_ids
        IF quote_selected_suppliers IS NOT NULL AND user_supplier_id = ANY(quote_selected_suppliers) THEN
            RETURN true;
        END IF;

        -- 3) Foi convidado via tabela quote_suppliers
        SELECT EXISTS(
            SELECT 1
            FROM public.quote_suppliers qs
            WHERE qs.quote_id = quote_id_param
            AND qs.supplier_id = user_supplier_id
        ) INTO invited_via_link;

        IF invited_via_link THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$;