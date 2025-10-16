-- ============================================================
-- MIGRAÇÃO: Corrigir Exclusão em Cascata de Clientes
-- ============================================================
-- Problema: Foreign keys sem ON DELETE CASCADE impedem exclusão
-- Solução: Adicionar CASCADE em todas as tabelas relacionadas

-- 1. PROFILES - Excluir profiles quando cliente for excluído
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 2. USERS - Excluir users quando cliente for excluído
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_client_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 3. SUBSCRIPTIONS - Excluir assinaturas quando cliente for excluído
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_client_id_fkey;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 4. INVOICES - Excluir faturas quando cliente for excluído
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 5. QUOTES - Excluir cotações quando cliente for excluído
ALTER TABLE public.quotes 
DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;

ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 6. PAYMENTS - Excluir pagamentos quando cliente for excluído
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_client_id_fkey;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 7. CLIENT_SUPPLIERS - Excluir vínculos com fornecedores
ALTER TABLE public.client_suppliers 
DROP CONSTRAINT IF EXISTS client_suppliers_client_id_fkey;

ALTER TABLE public.client_suppliers 
ADD CONSTRAINT client_suppliers_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 8. SUPPORT_TICKETS - Excluir tickets quando cliente for excluído
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_client_id_fkey;

ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 9. CLIENT_USAGE - Excluir uso mensal quando cliente for excluído
ALTER TABLE public.client_usage 
DROP CONSTRAINT IF EXISTS client_usage_client_id_fkey;

ALTER TABLE public.client_usage 
ADD CONSTRAINT client_usage_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 10. DELIVERIES - Excluir entregas quando cliente for excluído
ALTER TABLE public.deliveries 
DROP CONSTRAINT IF EXISTS deliveries_client_id_fkey;

ALTER TABLE public.deliveries 
ADD CONSTRAINT deliveries_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 11. CONTRACTS - Excluir contratos quando cliente for excluído
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;