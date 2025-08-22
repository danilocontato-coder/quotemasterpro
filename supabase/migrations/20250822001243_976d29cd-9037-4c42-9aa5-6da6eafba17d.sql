-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('admin', 'manager', 'collaborator', 'supplier')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar_url TEXT,
  last_access TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_id UUID REFERENCES public.clients(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  force_password_change BOOLEAN DEFAULT true,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create user_groups table
CREATE TABLE public.user_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  permissions TEXT[] DEFAULT '{}',
  user_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_system_group BOOLEAN DEFAULT false
);

-- Create user_group_memberships table (many-to-many relationship)
CREATE TABLE public.user_group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid()) OR
  auth_user_id = auth.uid()
);

CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  auth_user_id = auth.uid()
);

CREATE POLICY "users_delete" ON public.users FOR DELETE USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

-- Create RLS policies for user_groups
CREATE POLICY "user_groups_select" ON public.user_groups FOR SELECT USING (
  get_user_role() = 'admin' OR true
);

CREATE POLICY "user_groups_insert" ON public.user_groups FOR INSERT WITH CHECK (
  get_user_role() = 'admin' OR true
);

CREATE POLICY "user_groups_update" ON public.user_groups FOR UPDATE USING (
  get_user_role() = 'admin' OR true
);

CREATE POLICY "user_groups_delete" ON public.user_groups FOR DELETE USING (
  get_user_role() = 'admin' OR true
);

-- Create RLS policies for user_group_memberships
CREATE POLICY "user_group_memberships_select" ON public.user_group_memberships FOR SELECT USING (
  get_user_role() = 'admin' OR 
  user_id IN (SELECT id FROM users WHERE 
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
    supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid()) OR
    auth_user_id = auth.uid()
  )
);

CREATE POLICY "user_group_memberships_insert" ON public.user_group_memberships FOR INSERT WITH CHECK (
  get_user_role() = 'admin' OR 
  user_id IN (SELECT id FROM users WHERE 
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "user_group_memberships_delete" ON public.user_group_memberships FOR DELETE USING (
  get_user_role() = 'admin' OR 
  user_id IN (SELECT id FROM users WHERE 
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to update user count in groups
CREATE OR REPLACE FUNCTION public.update_group_user_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user count for the affected group(s)
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_groups 
    SET user_count = (
      SELECT COUNT(*) 
      FROM public.user_group_memberships 
      WHERE group_id = NEW.group_id
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_groups 
    SET user_count = (
      SELECT COUNT(*) 
      FROM public.user_group_memberships 
      WHERE group_id = OLD.group_id
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user count updates
CREATE TRIGGER update_group_user_count_trigger
  AFTER INSERT OR DELETE ON public.user_group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_user_count();

-- Insert some default system groups
INSERT INTO public.user_groups (name, description, color, permissions, is_system_group) VALUES
('Administradores', 'Acesso completo ao sistema', '#dc2626', ARRAY['all'], true),
('Gestores', 'Gestão de cotações e aprovações', '#2563eb', ARRAY['quotes.manage', 'approvals.manage', 'suppliers.view'], true),
('Colaboradores', 'Criação e acompanhamento de cotações', '#16a34a', ARRAY['quotes.create', 'quotes.view'], true),
('Fornecedores', 'Resposta a cotações', '#ea580c', ARRAY['quotes.respond', 'products.manage'], true);

-- Enable realtime for all tables
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.user_groups REPLICA IDENTITY FULL;
ALTER TABLE public.user_group_memberships REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_group_memberships;