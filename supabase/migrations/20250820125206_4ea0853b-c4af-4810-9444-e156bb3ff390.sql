-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3b82f6',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Categories are viewable by all authenticated users" 
ON public.categories 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Categories can be created by authenticated users" 
ON public.categories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Categories can be updated by authenticated users" 
ON public.categories 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Categories can be deleted by authenticated users" 
ON public.categories 
FOR DELETE 
TO authenticated
USING (true);

-- Insert default categories
INSERT INTO public.categories (name, description, color) VALUES 
('Materiais de Construção', 'Cimento, tijolos, areia, etc.', '#8b5cf6'),
('Produtos de Limpeza', 'Detergentes, desinfetantes, etc.', '#06b6d4'),
('Elétrica e Iluminação', 'Fios, lâmpadas, interruptores, etc.', '#f59e0b'),
('Jardinagem', 'Plantas, fertilizantes, ferramentas de jardim, etc.', '#10b981'),
('Ferramentas', 'Martelos, chaves, furadeiras, etc.', '#ef4444'),
('Serviços', 'Manutenção, limpeza, jardinagem, etc.', '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at on categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();