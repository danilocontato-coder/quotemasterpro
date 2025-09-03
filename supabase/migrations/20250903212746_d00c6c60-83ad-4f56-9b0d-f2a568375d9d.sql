-- LIMPEZA FINAL - Desconectar todos os profiles e users restantes dos clientes de teste

DO $$
DECLARE
    teste_client_id UUID := '107eedda-ca8f-48f3-89ee-cfbb7c5c69e1';
BEGIN
    -- 1. Desconectar profiles restantes do cliente teste
    UPDATE public.profiles 
    SET client_id = NULL 
    WHERE client_id = teste_client_id;
    
    -- 2. Desconectar users restantes do cliente teste  
    UPDATE public.users 
    SET client_id = NULL 
    WHERE client_id = teste_client_id;
    
    -- 3. Agora deletar o cliente teste com segurança
    DELETE FROM public.clients WHERE id = teste_client_id;
    
    -- 4. Deletar outros clientes sem dependências
    DELETE FROM public.clients 
    WHERE name IN ('Condomínio Vila Verde', 'Edifício Comercial Prime');
    
    RAISE NOTICE 'Limpeza final concluída com sucesso';
END $$;