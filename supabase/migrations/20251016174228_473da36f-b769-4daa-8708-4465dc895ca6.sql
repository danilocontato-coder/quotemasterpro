-- Adicionar colunas de integração Asaas em subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Adicionar colunas de integração Asaas e NFS-e em invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS asaas_charge_id TEXT,
ADD COLUMN IF NOT EXISTS nfse_id TEXT,
ADD COLUMN IF NOT EXISTS nfse_number TEXT,
ADD COLUMN IF NOT EXISTS nfse_url TEXT,
ADD COLUMN IF NOT EXISTS nfse_status TEXT DEFAULT 'not_issued',
ADD COLUMN IF NOT EXISTS nfse_issued_at TIMESTAMP WITH TIME ZONE;

-- Adicionar configurações de NFS-e em financial_settings
ALTER TABLE public.financial_settings
ADD COLUMN IF NOT EXISTS auto_issue_nfse BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS issue_nfse_with_invoice BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS nfse_municipal_service_code TEXT,
ADD COLUMN IF NOT EXISTS nfse_municipal_service_id TEXT DEFAULT '01.01',
ADD COLUMN IF NOT EXISTS nfse_service_description TEXT DEFAULT 'Serviços de gestão de cotações e fornecedores',
ADD COLUMN IF NOT EXISTS nfse_default_observations TEXT,
ADD COLUMN IF NOT EXISTS asaas_billing_type TEXT DEFAULT 'BOLETO';

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription_id ON public.subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_customer_id ON public.subscriptions(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_asaas_charge_id ON public.invoices(asaas_charge_id);
CREATE INDEX IF NOT EXISTS idx_invoices_nfse_status ON public.invoices(nfse_status);

-- Comentários para documentação
COMMENT ON COLUMN public.subscriptions.asaas_subscription_id IS 'ID da assinatura recorrente no Asaas';
COMMENT ON COLUMN public.subscriptions.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN public.invoices.asaas_charge_id IS 'ID da cobrança (payment) no Asaas';
COMMENT ON COLUMN public.invoices.nfse_id IS 'ID da NFS-e no Asaas';
COMMENT ON COLUMN public.invoices.nfse_number IS 'Número da NFS-e emitida';
COMMENT ON COLUMN public.invoices.nfse_url IS 'URL do PDF da NFS-e';
COMMENT ON COLUMN public.invoices.nfse_status IS 'Status da emissão: not_issued, processing, issued, error';
COMMENT ON COLUMN public.financial_settings.auto_issue_nfse IS 'Emitir NFS-e automaticamente após pagamento confirmado';
COMMENT ON COLUMN public.financial_settings.issue_nfse_with_invoice IS 'Emitir NFS-e junto com a geração do boleto';
COMMENT ON COLUMN public.financial_settings.asaas_billing_type IS 'Tipo de cobrança padrão no Asaas: BOLETO, PIX, CREDIT_CARD, UNDEFINED';