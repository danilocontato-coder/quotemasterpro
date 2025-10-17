-- Tabela de transferências de fornecedores
CREATE TABLE IF NOT EXISTS public.supplier_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  transfer_method TEXT NOT NULL CHECK (transfer_method IN ('PIX', 'TED')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  asaas_transfer_id TEXT,
  bank_account JSONB NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_supplier_transfers_supplier ON public.supplier_transfers(supplier_id);
CREATE INDEX idx_supplier_transfers_status ON public.supplier_transfers(status);
CREATE INDEX idx_supplier_transfers_requested_at ON public.supplier_transfers(requested_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER trg_supplier_transfers_updated_at
  BEFORE UPDATE ON public.supplier_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.supplier_transfers ENABLE ROW LEVEL SECURITY;

-- Fornecedores só veem suas próprias transferências
CREATE POLICY "supplier_transfers_select_own"
  ON public.supplier_transfers
  FOR SELECT
  USING (supplier_id = get_current_user_supplier_id());

-- Fornecedores podem solicitar transferências
CREATE POLICY "supplier_transfers_insert_own"
  ON public.supplier_transfers
  FOR INSERT
  WITH CHECK (supplier_id = get_current_user_supplier_id());

-- Admins têm acesso total
CREATE POLICY "supplier_transfers_admin_all"
  ON public.supplier_transfers
  FOR ALL
  USING (get_user_role() = 'admin');

COMMENT ON TABLE public.supplier_transfers IS 'Registra solicitações de transferência de saldo Asaas para contas bancárias dos fornecedores';
COMMENT ON COLUMN public.supplier_transfers.transfer_method IS 'PIX ou TED';
COMMENT ON COLUMN public.supplier_transfers.bank_account IS 'Dados da conta bancária de destino (banco, agência, conta, etc.)';
COMMENT ON COLUMN public.supplier_transfers.asaas_transfer_id IS 'ID da transferência no Asaas';