-- Create ai_credits table
CREATE TABLE IF NOT EXISTS public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  available_credits INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

-- Create ai_credit_transactions table
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create function to debit AI credits
CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  p_client_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_credits
  SET 
    available_credits = available_credits - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE client_id = p_client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não possui registro de créditos';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for ai_credits

-- Administradora can view credits for herself and condominiums
CREATE POLICY "ai_credits_administradora_select"
ON public.ai_credits
FOR SELECT
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

-- Admin full access
CREATE POLICY "ai_credits_admin_all"
ON public.ai_credits
FOR ALL
USING (has_role_text(auth.uid(), 'admin'));

-- RLS Policies for ai_credit_transactions

-- Administradora can view transactions for herself and condominiums
CREATE POLICY "ai_credit_transactions_administradora_select"
ON public.ai_credit_transactions
FOR SELECT
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

-- Admin full access
CREATE POLICY "ai_credit_transactions_admin_all"
ON public.ai_credit_transactions
FOR ALL
USING (has_role_text(auth.uid(), 'admin'));

-- Update ai_proposal_analyses RLS policies

-- Administradora can view analyses for herself and condominiums
CREATE POLICY "ai_analyses_administradora_select"
ON public.ai_proposal_analyses
FOR SELECT
USING (
  client_id = get_current_user_client_id()
  OR client_id IN (
    SELECT id FROM public.clients 
    WHERE parent_client_id = get_current_user_client_id()
  )
);

-- Initialize ai_credits for existing clients
INSERT INTO public.ai_credits (client_id, available_credits, total_earned)
SELECT id, 1000, 1000 
FROM public.clients
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credits WHERE client_id = clients.id
);
