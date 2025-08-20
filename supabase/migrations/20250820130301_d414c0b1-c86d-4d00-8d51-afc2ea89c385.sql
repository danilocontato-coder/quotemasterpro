-- Insert sample products for testing
INSERT INTO public.products (code, name, description, category, unit_price, stock_quantity, status) VALUES 
('CIMENT-001', 'Cimento Portland 50kg', 'Cimento para construção civil', 'Materiais de Construção', 25.90, 150, 'active'),
('DETERG-001', 'Detergente Neutro 5L', 'Detergente concentrado para limpeza geral', 'Produtos de Limpeza', 12.50, 45, 'active'),
('LAMP-LED-001', 'Lâmpada LED 15W', 'Lâmpada LED branca fria', 'Elétrica e Iluminação', 8.90, 8, 'active'),
('FERT-001', 'Fertilizante NPK 10kg', 'Fertilizante para jardinagem', 'Jardinagem', 35.00, 25, 'active'),
('FURAD-001', 'Furadeira de Impacto 650W', 'Furadeira profissional com maleta', 'Ferramentas', 189.90, 3, 'active'),
('SERV-LIMP-001', 'Serviço de Limpeza Geral', 'Limpeza completa de áreas comuns', 'Serviços', 150.00, 0, 'active'),
('TINTA-001', 'Tinta Acrílica Branca 18L', 'Tinta para paredes internas e externas', 'Materiais de Construção', 89.90, 12, 'active'),
('DESINFET-001', 'Desinfetante 1L', 'Desinfetante multiuso com álcool', 'Produtos de Limpeza', 4.50, 2, 'active')
ON CONFLICT (code) DO NOTHING;