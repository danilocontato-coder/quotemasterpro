-- Corrigir migração de clientes removendo conflitos

-- Primeiro remover políticas existentes se houver
DROP POLICY IF EXISTS "client_groups_admin_all" ON public.client_groups;
DROP POLICY IF EXISTS "client_groups_select_authenticated" ON public.client_groups;

-- Verificar se tabela clients já tem as colunas necessárias
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE;

-- Criar tabela de grupos de clientes se não existir
CREATE TABLE IF NOT EXISTS public.client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  client_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_groups
CREATE POLICY "client_groups_admin_all" ON public.client_groups
FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "client_groups_select_authenticated" ON public.client_groups
FOR SELECT USING (true);

-- Função para atualizar contagem de clientes em grupos
CREATE OR REPLACE FUNCTION update_client_group_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contagem quando cliente é inserido
  IF TG_OP = 'INSERT' AND NEW.group_id IS NOT NULL THEN
    UPDATE public.client_groups 
    SET client_count = (
      SELECT COUNT(*) FROM public.clients WHERE group_id = NEW.group_id
    )
    WHERE id = NEW.group_id;
  END IF;
  
  -- Atualizar contagem quando cliente é atualizado
  IF TG_OP = 'UPDATE' THEN
    IF OLD.group_id IS NOT NULL THEN
      UPDATE public.client_groups 
      SET client_count = (
        SELECT COUNT(*) FROM public.clients WHERE group_id = OLD.group_id
      )
      WHERE id = OLD.group_id;
    END IF;
    
    IF NEW.group_id IS NOT NULL AND NEW.group_id != OLD.group_id THEN
      UPDATE public.client_groups 
      SET client_count = (
        SELECT COUNT(*) FROM public.clients WHERE group_id = NEW.group_id
      )
      WHERE id = NEW.group_id;
    END IF;
  END IF;
  
  -- Atualizar contagem quando cliente é removido
  IF TG_OP = 'DELETE' AND OLD.group_id IS NOT NULL THEN
    UPDATE public.client_groups 
    SET client_count = (
      SELECT COUNT(*) FROM public.clients WHERE group_id = OLD.group_id
    )
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contagem automaticamente
DROP TRIGGER IF EXISTS update_client_group_count_trigger ON public.clients;
CREATE TRIGGER update_client_group_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_client_group_count();

-- Inserir grupos padrão se não existirem
INSERT INTO public.client_groups (name, description, color) 
VALUES 
  ('Condomínios Residenciais', 'Condomínios residenciais de médio e alto padrão', '#3b82f6'),
  ('Condomínios Comerciais', 'Edifícios comerciais e empresariais', '#10b981'),
  ('Empresas Privadas', 'Empresas privadas de diversos segmentos', '#8b5cf6')
ON CONFLICT DO NOTHING;