-- LIMPEZA CUIDADOSA DE DADOS DE TESTE RESPEITANDO FOREIGN KEYS
-- Esta migration remove dados de teste em ordem segura

DO $$
DECLARE
    test_client_id UUID := 'da114bec-1359-4a07-ae95-906e6c70e473'; -- Condomínio Residencial Azul
BEGIN
    -- 1. Primeiro, limpar dados vinculados ao cliente de teste
    
    -- 1a. Limpar products vinculados ao cliente de teste
    DELETE FROM public.products WHERE client_id = test_client_id;
    
    -- 1b. Limpar quote_items de cotações vinculadas ao cliente de teste
    DELETE FROM public.quote_items 
    WHERE quote_id IN (SELECT id FROM public.quotes WHERE client_id = test_client_id);
    
    -- 1c. Limpar quotes vinculadas ao cliente de teste
    DELETE FROM public.quotes WHERE client_id = test_client_id;
    
    -- 1d. Limpar payments vinculados ao cliente de teste
    DELETE FROM public.payments WHERE client_id = test_client_id;
    
    -- 1e. Limpar audit_logs relacionados ao cliente de teste
    DELETE FROM public.audit_logs 
    WHERE details::text LIKE '%' || test_client_id::text || '%';
    
    -- 2. Desconectar profiles do cliente de teste (não deletar, apenas desconectar)
    UPDATE public.profiles 
    SET client_id = NULL 
    WHERE client_id = test_client_id;
    
    -- 3. Desconectar users do cliente de teste
    UPDATE public.users 
    SET client_id = NULL 
    WHERE client_id = test_client_id;
    
    -- 4. Agora podemos deletar o cliente de teste com segurança
    DELETE FROM public.clients WHERE id = test_client_id;
    
    -- 5. Limpar outros clientes de teste (que não têm dependências)
    DELETE FROM public.clients 
    WHERE name IN (
        'Condomínio Vila Verde', 
        'Edifício Comercial Prime'
    );
    
    -- 6. Limpar cliente 'teste' se existir
    DELETE FROM public.clients WHERE name = 'teste';
    
    RAISE NOTICE 'Limpeza de dados de teste realizada com sucesso';
END $$;