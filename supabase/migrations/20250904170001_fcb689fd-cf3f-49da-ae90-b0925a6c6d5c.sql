-- Adicionar campos para separar categorias do sistema das do usuário
ALTER TABLE public.categories ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;

-- Marcar todas as categorias existentes como do sistema (se houver)
UPDATE public.categories SET is_system = true WHERE created_by IS NULL;

-- Atualizar as políticas RLS para permitir visualização adequada
DROP POLICY IF EXISTS "Categories are viewable by all authenticated users" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "Categories can be created by authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Categories can be updated by authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Categories can be deleted by authenticated users" ON public.categories;

-- Política para SELECT: ver categorias do sistema + próprias categorias
CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT USING (
    is_system = true OR created_by = auth.uid()
  );

-- Política para INSERT: usuários podem criar categorias próprias
CREATE POLICY "categories_insert_policy" ON public.categories
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND is_system = false
  );

-- Política para UPDATE: só pode editar próprias categorias (não do sistema)
CREATE POLICY "categories_update_policy" ON public.categories
  FOR UPDATE USING (
    created_by = auth.uid() AND is_system = false
  );

-- Política para DELETE: só pode deletar próprias categorias (não do sistema)
CREATE POLICY "categories_delete_policy" ON public.categories
  FOR DELETE USING (
    created_by = auth.uid() AND is_system = false
  );

-- Inserir algumas categorias padrão do sistema
INSERT INTO public.categories (name, description, color, is_system) VALUES
('Limpeza', 'Produtos de limpeza e higienização', '#10B981', true),
('Manutenção', 'Materiais e serviços de manutenção', '#F59E0B', true),
('Escritório', 'Material de escritório e papelaria', '#3B82F6', true),
('Segurança', 'Equipamentos e serviços de segurança', '#EF4444', true),
('Jardinagem', 'Produtos e serviços para jardins e áreas verdes', '#22C55E', true),
('Alimentação', 'Produtos alimentícios e bebidas', '#F97316', true),
('Construção', 'Materiais e serviços de construção civil', '#8B5CF6', true),
('Eletrônicos', 'Equipamentos eletrônicos e elétricos', '#06B6D4', true),
('Vestuário', 'Roupas, uniformes e acessórios', '#EC4899', true),
('Transporte', 'Serviços de transporte e logística', '#84CC16', true)
ON CONFLICT (name) DO NOTHING;