-- ============================================
-- FASE 1+2: Sistema de Escrow com Retry Automático
-- ============================================

-- 1. Tabela para registrar erros e tentar novamente
CREATE TABLE IF NOT EXISTS public.escrow_release_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_errors_payment ON public.escrow_release_errors(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_errors_retry ON public.escrow_release_errors(next_retry_at) WHERE resolved_at IS NULL;

-- 2. Adicionar colunas de rastreamento em payments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transfer_status') THEN
    ALTER TABLE public.payments ADD COLUMN transfer_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transfer_date') THEN
    ALTER TABLE public.payments ADD COLUMN transfer_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'asaas_transfer_id') THEN
    ALTER TABLE public.payments ADD COLUMN asaas_transfer_id TEXT;
  END IF;
END $$;

-- 3. RLS para errors
ALTER TABLE public.escrow_release_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all errors"
  ON public.escrow_release_errors
  FOR SELECT
  USING (public.has_any_role(ARRAY['admin', 'super_admin']));
