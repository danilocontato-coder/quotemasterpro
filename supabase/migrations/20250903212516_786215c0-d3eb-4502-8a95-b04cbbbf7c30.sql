-- LIMPEZA COMPLETA DE DADOS DE TESTE
-- Esta migration remove todos os dados de teste do sistema para garantir 
-- que novos usuários vejam o sistema completamente vazio

DO $$
BEGIN
    -- 1. Limpar notificações de teste
    DELETE FROM public.notifications 
    WHERE title IN (
        'Nova cotação recebida', 
        'Pagamento processado', 
        'Cotação vencendo', 
        'Sistema atualizado', 
        'Novo fornecedor aprovado'
    );
    
    -- 2. Limpar cotações de teste
    DELETE FROM public.quote_items WHERE quote_id IN ('quote-002', 'quote-003');
    DELETE FROM public.quotes WHERE id IN ('quote-002', 'quote-003');
    
    -- 3. Limpar produtos de teste
    DELETE FROM public.products 
    WHERE name IN ('PRODUTO TESTE', 'TESTE SERVIÇO', 'CIMENTO POTY')
    OR code LIKE 'TEST%';
    
    -- 4. Limpar clientes de teste (mantém apenas dados reais de usuários autenticados)
    DELETE FROM public.clients 
    WHERE name IN (
        'Condomínio Residencial Azul',
        'Condomínio Vila Verde', 
        'Edifício Comercial Prime'
    );
    
    -- 5. Limpar usuários sem auth_user_id (dados órfãos)
    DELETE FROM public.users WHERE auth_user_id IS NULL;
    
    -- 6. Limpar profiles sem client_id ou supplier_id adequados (exceto admins)
    DELETE FROM public.profiles 
    WHERE role NOT IN ('admin', 'super_admin') 
    AND client_id IS NULL 
    AND supplier_id IS NULL;
    
    -- 7. Limpar dados de auditoria relacionados aos dados removidos
    DELETE FROM public.audit_logs 
    WHERE entity_id IN ('quote-002', 'quote-003')
    OR details::text LIKE '%teste%'
    OR details::text LIKE '%TESTE%';
    
    RAISE NOTICE 'Limpeza completa de dados de teste realizada com sucesso';
END $$;