-- Correção retroativa: inserir apenas fornecedores com client_id válido
-- Primeiro, tentamos inserir apenas os que não existem E têm client_id
INSERT INTO public.users (auth_user_id, client_id, name, email, role, status)
SELECT 
  p.id,
  s.client_id,
  p.name,
  p.email,
  'supplier',
  'active'
FROM profiles p
INNER JOIN suppliers s ON s.id = p.supplier_id
WHERE p.role = 'supplier' 
  AND p.supplier_id IS NOT NULL
  AND s.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.auth_user_id = p.id
  );

-- Depois, atualizamos os que já existem para garantir dados corretos
UPDATE public.users u
SET 
  client_id = s.client_id,
  name = p.name,
  email = p.email,
  role = 'supplier',
  status = 'active',
  updated_at = now()
FROM profiles p
INNER JOIN suppliers s ON s.id = p.supplier_id
WHERE u.auth_user_id = p.id
  AND p.role = 'supplier' 
  AND p.supplier_id IS NOT NULL
  AND s.client_id IS NOT NULL;

-- Correção retroativa: inserir fornecedores existentes em public.user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'supplier'
FROM profiles p
WHERE p.role = 'supplier' 
  AND p.supplier_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;