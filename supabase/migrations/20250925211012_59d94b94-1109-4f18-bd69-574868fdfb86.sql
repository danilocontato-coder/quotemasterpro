-- Corrigir search_path na função de segurança que acabamos de criar
CREATE OR REPLACE FUNCTION current_user_can_see_quote(quote_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_client_id uuid;
    user_supplier_id uuid;
    quote_client_id uuid;
    quote_supplier_id uuid;
    quote_selected_suppliers uuid[];
BEGIN
    -- Obter informações do usuário atual
    SELECT 
        COALESCE(p.role, 'anonymous'),
        p.client_id,
        p.supplier_id
    INTO user_role, user_client_id, user_supplier_id
    FROM profiles p
    WHERE p.id = auth.uid();

    -- Se não há usuário autenticado, negar acesso
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Admins podem ver tudo
    IF user_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Obter informações da cotação
    SELECT 
        q.client_id,
        q.supplier_id,
        q.selected_supplier_ids
    INTO quote_client_id, quote_supplier_id, quote_selected_suppliers
    FROM quotes q
    WHERE q.id = quote_id_param;

    -- Se a cotação não existe, negar acesso
    IF quote_client_id IS NULL THEN
        RETURN false;
    END IF;

    -- Clientes podem ver cotações do seu cliente
    IF user_client_id IS NOT NULL AND user_client_id = quote_client_id THEN
        RETURN true;
    END IF;

    -- Fornecedores podem ver apenas suas cotações específicas
    IF user_supplier_id IS NOT NULL THEN
        -- Cotação atribuída diretamente ao fornecedor
        IF quote_supplier_id = user_supplier_id THEN
            RETURN true;
        END IF;
        
        -- Fornecedor está na lista de fornecedores selecionados
        IF quote_selected_suppliers IS NOT NULL AND 
           user_supplier_id = ANY(quote_selected_suppliers) THEN
            RETURN true;
        END IF;
    END IF;

    -- Por padrão, negar acesso para garantir segurança
    RETURN false;
END;
$$;