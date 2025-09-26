-- CORREÇÃO CRÍTICA: Várias tabelas sem segregação por cliente

-- 1. TABELA AI_NEGOTIATIONS - Segregar por cliente via quote
ALTER TABLE public.ai_negotiations
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Preencher client_id baseado na quote associada
UPDATE public.ai_negotiations 
SET client_id = (
  SELECT q.client_id 
  FROM public.quotes q 
  WHERE q.id = ai_negotiations.quote_id
)
WHERE client_id IS NULL;

-- 2. TABELA QUOTE_ITEMS - Segregar por cliente via quote
ALTER TABLE public.quote_items
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Preencher client_id baseado na quote associada
UPDATE public.quote_items 
SET client_id = (
  SELECT q.client_id 
  FROM public.quotes q 
  WHERE q.id = quote_items.quote_id
)
WHERE client_id IS NULL;

-- 3. TABELA QUOTE_TOKENS - Segregar por cliente via quote
ALTER TABLE public.quote_tokens
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Preencher client_id baseado na quote associada
UPDATE public.quote_tokens 
SET client_id = (
  SELECT q.client_id 
  FROM public.quotes q 
  WHERE q.id = quote_tokens.quote_id
)
WHERE client_id IS NULL;

-- 4. TABELA USER_SETTINGS - Segregar por cliente via user
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Preencher client_id baseado no user
UPDATE public.user_settings 
SET client_id = (
  SELECT p.client_id 
  FROM public.profiles p 
  WHERE p.id = user_settings.user_id
)
WHERE client_id IS NULL;

-- 5. TABELA COUPONS - Adicionar client_id para cupons específicos de cliente
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Cupons existentes são tratados como globais (client_id = null)