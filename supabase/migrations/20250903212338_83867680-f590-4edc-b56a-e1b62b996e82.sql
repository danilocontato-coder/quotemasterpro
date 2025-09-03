-- Inserir algumas notificações de teste para demonstrar a funcionalidade
-- Estas notificações serão vinculadas ao primeiro usuário encontrado na tabela profiles

DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Pegar o primeiro usuário da tabela profiles
    SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
    
    -- Se encontrou um usuário, criar notificações de teste
    IF first_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, priority, read, metadata) VALUES
        (first_user_id, 'Nova cotação recebida', 'Fornecedor XYZ enviou proposta para Material de limpeza - Valor: R$ 2.450,00', 'info', 'normal', false, '{"quote_id": "q-001", "supplier": "XYZ Materiais"}'),
        (first_user_id, 'Pagamento processado', 'Pagamento de R$ 1.250,00 foi confirmado com sucesso', 'success', 'normal', false, '{"payment_id": "pay-001", "amount": 1250.00}'),
        (first_user_id, 'Cotação vencendo', 'Cotação Materiais elétricos vence em 2 dias', 'warning', 'high', false, '{"quote_id": "q-002", "deadline": "2025-01-05"}'),
        (first_user_id, 'Sistema atualizado', 'Nova versão do sistema foi implantada com melhorias de performance', 'info', 'low', true, '{"version": "1.2.3"}'),
        (first_user_id, 'Novo fornecedor aprovado', 'Fornecedor ABC Construção foi aprovado e está disponível', 'success', 'normal', false, '{"supplier_id": "sup-003", "supplier_name": "ABC Construção"}');
    END IF;
END $$;