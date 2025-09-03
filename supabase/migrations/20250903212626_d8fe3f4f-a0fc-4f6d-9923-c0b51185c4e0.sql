-- Remover notificações de teste previamente inseridas
DELETE FROM public.notifications 
WHERE title IN (
  'Nova cotação recebida',
  'Pagamento processado',
  'Cotação vencendo',
  'Sistema atualizado',
  'Novo fornecedor aprovado'
);