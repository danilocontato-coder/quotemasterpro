-- Create supplier record for existing user
INSERT INTO public.suppliers (
  name,
  cnpj,
  email,
  phone,
  whatsapp,
  status,
  type,
  region,
  state,
  city,
  specialties,
  is_certified,
  visibility_scope,
  subscription_plan_id
) VALUES (
  'Alpha Materiais Ltda',
  '12345678000195',
  'vendas@alphamateriais.com',
  '+55 11 99999-0000',
  '+55 11 99999-0000',
  'active',
  'local',
  'Sudeste',
  'São Paulo',
  'São Paulo',
  ARRAY['materiais_construcao', 'ferramentas', 'equipamentos'],
  false,
  'region',
  'supplier-basic'
);

-- Update profile to link to the supplier
UPDATE public.profiles 
SET supplier_id = (
  SELECT id FROM public.suppliers 
  WHERE email = 'vendas@alphamateriais.com' 
  LIMIT 1
)
WHERE id = '1e017a63-c5a4-4d5b-a7f4-00a4c0f8a900' AND role = 'supplier';