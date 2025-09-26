-- Criar algumas categorias padrão do sistema que todos os clientes podem usar
INSERT INTO public.categories (name, description, color, is_system, client_id) VALUES
('Alimentação', 'Produtos alimentícios e bebidas', '#10b981', true, null),
('Construção', 'Materiais e serviços de construção', '#f59e0b', true, null),
('Elétrica e Iluminação', 'Produtos elétricos e sistemas de iluminação', '#3b82f6', true, null),
('Eletrônicos', 'Equipamentos eletrônicos e tecnologia', '#8b5cf6', true, null),
('Escritório', 'Material de escritório e papelaria', '#ef4444', true, null),
('Ferramentas', 'Ferramentas e equipamentos', '#06b6d4', true, null),
('Jardinagem', 'Produtos para jardim e paisagismo', '#22c55e', true, null),
('Limpeza', 'Produtos e serviços de limpeza', '#14b8a6', true, null),
('Manutenção', 'Serviços de manutenção predial', '#f97316', true, null),
('Segurança', 'Equipamentos e serviços de segurança', '#dc2626', true, null),
('Serviços', 'Serviços diversos', '#6366f1', true, null),
('Transporte', 'Transporte e logística', '#84cc16', true, null)
ON CONFLICT (name) DO NOTHING;