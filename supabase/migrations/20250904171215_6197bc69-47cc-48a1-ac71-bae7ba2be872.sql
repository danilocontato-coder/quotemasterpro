-- Habilitar realtime para a tabela products
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Garantir REPLICA IDENTITY FULL para capturar todos os dados nas atualizações
ALTER TABLE public.products REPLICA IDENTITY FULL;