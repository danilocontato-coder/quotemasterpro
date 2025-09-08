-- Índices de performance (sem CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_quotes_client_status 
ON public.quotes(client_id, status);

CREATE INDEX IF NOT EXISTS idx_profiles_client_id 
ON public.profiles(client_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_specialties 
ON public.suppliers USING GIN(specialties);

CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_supplier 
ON public.quote_responses(quote_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON public.users(auth_user_id);