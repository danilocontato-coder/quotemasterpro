-- Primeiro, vamos verificar se existe algum cliente no banco
-- Se não existir, vamos criar um cliente padrão e associar o usuário manager

-- Criar um cliente padrão se não existir
INSERT INTO public.clients (id, name, cnpj, email, status, company_name, subscription_plan_id)
VALUES (
  gen_random_uuid(),
  'Empresa Teste',
  '00.000.000/0001-00',
  'teste@teste.com.br',
  'active',
  'Empresa Teste Ltda',
  'plan-basic'
) 
ON CONFLICT DO NOTHING;

-- Associar o usuário manager ao cliente criado
UPDATE public.profiles 
SET client_id = (
  SELECT id FROM public.clients 
  WHERE email = 'teste@teste.com.br' 
  LIMIT 1
)
WHERE id = '9078179f-cf8e-48d2-a23e-9b4113bbe475' 
AND client_id IS NULL;