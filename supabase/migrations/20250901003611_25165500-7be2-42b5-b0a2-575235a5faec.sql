-- Create permission profiles table
CREATE TABLE IF NOT EXISTS public.permission_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  client_id uuid REFERENCES public.clients(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for permission_profiles
CREATE POLICY "permission_profiles_select" 
ON public.permission_profiles 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) 
  OR 
  (client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
);

CREATE POLICY "permission_profiles_insert" 
ON public.permission_profiles 
FOR INSERT 
WITH CHECK (
  (get_user_role() = 'admin'::text) 
  OR 
  (client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
);

CREATE POLICY "permission_profiles_update" 
ON public.permission_profiles 
FOR UPDATE 
USING (
  (get_user_role() = 'admin'::text) 
  OR 
  (client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
);

CREATE POLICY "permission_profiles_delete" 
ON public.permission_profiles 
FOR DELETE 
USING (
  (get_user_role() = 'admin'::text) 
  OR 
  (client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
);

-- Create trigger for updated_at
CREATE TRIGGER update_permission_profiles_updated_at
  BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update user_groups table to include permissions properly
ALTER TABLE public.user_groups 
ADD COLUMN IF NOT EXISTS permission_profile_id uuid REFERENCES public.permission_profiles(id);

-- Insert default permission profiles
INSERT INTO public.permission_profiles (id, name, description, permissions, client_id) VALUES
('admin-profile', 'Administrador', 'Acesso completo ao sistema', '{
  "quotes": {"view": true, "create": true, "edit": true, "delete": true},
  "products": {"view": true, "create": true, "edit": true, "delete": true},
  "suppliers": {"view": true, "create": true, "edit": true, "delete": true},
  "payments": {"view": true, "create": true, "edit": true, "delete": true},
  "communication": {"view": true, "create": true, "edit": true, "delete": true},
  "users": {"view": true, "create": true, "edit": true, "delete": true},
  "settings": {"view": true, "create": true, "edit": true, "delete": true},
  "reports": {"view": true, "create": true, "edit": true, "delete": true}
}', NULL),
('manager-profile', 'Gerente', 'Gerencia cotações, fornecedores e equipe', '{
  "quotes": {"view": true, "create": true, "edit": true, "delete": false},
  "products": {"view": true, "create": true, "edit": true, "delete": false},
  "suppliers": {"view": true, "create": true, "edit": true, "delete": false},
  "payments": {"view": true, "create": false, "edit": false, "delete": false},
  "communication": {"view": true, "create": true, "edit": true, "delete": false},
  "users": {"view": true, "create": true, "edit": true, "delete": false},
  "settings": {"view": true, "create": false, "edit": true, "delete": false},
  "reports": {"view": true, "create": true, "edit": false, "delete": false}
}', NULL),
('collaborator-profile', 'Colaborador', 'Cria e edita cotações', '{
  "quotes": {"view": true, "create": true, "edit": true, "delete": false},
  "products": {"view": true, "create": false, "edit": false, "delete": false},
  "suppliers": {"view": true, "create": false, "edit": false, "delete": false},
  "payments": {"view": true, "create": false, "edit": false, "delete": false},
  "communication": {"view": true, "create": true, "edit": false, "delete": false},
  "users": {"view": false, "create": false, "edit": false, "delete": false},
  "settings": {"view": true, "create": false, "edit": true, "delete": false},
  "reports": {"view": true, "create": false, "edit": false, "delete": false}
}', NULL),
('supplier-profile', 'Fornecedor', 'Responde cotações e gerencia catálogo', '{
  "quotes": {"view": true, "create": false, "edit": true, "delete": false},
  "products": {"view": true, "create": true, "edit": true, "delete": false},
  "suppliers": {"view": false, "create": false, "edit": true, "delete": false},
  "payments": {"view": true, "create": false, "edit": false, "delete": false},
  "communication": {"view": true, "create": true, "edit": true, "delete": false},
  "users": {"view": false, "create": false, "edit": false, "delete": false},
  "settings": {"view": true, "create": false, "edit": true, "delete": false},
  "reports": {"view": true, "create": false, "edit": false, "delete": false}
}', NULL)
ON CONFLICT (id) DO NOTHING;

-- Add permission_profile_id to users table if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permission_profile_id uuid REFERENCES public.permission_profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_permission_profiles_client_id ON public.permission_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_users_permission_profile_id ON public.users(permission_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_permission_profile_id ON public.user_groups(permission_profile_id);