-- Migration: Adicionar suporte ao Asaas

-- 1) Adicionar campos Asaas na tabela suppliers
ALTER TABLE suppliers 
  ADD COLUMN asaas_wallet_id text,
  ADD COLUMN bank_data jsonb DEFAULT '{
    "bank_code": null,
    "bank_name": null,
    "agency": null,
    "account_number": null,
    "account_type": "corrente",
    "account_holder_name": null,
    "account_holder_document": null,
    "pix_key": null,
    "pix_key_type": null,
    "verified": false,
    "verified_at": null
  }'::jsonb;

-- Índices para performance
CREATE INDEX idx_suppliers_asaas_wallet ON suppliers(asaas_wallet_id) WHERE asaas_wallet_id IS NOT NULL;
CREATE INDEX idx_suppliers_bank_verified ON suppliers((bank_data->>'verified'));

COMMENT ON COLUMN suppliers.asaas_wallet_id IS 'ID da subconta (wallet) do fornecedor no Asaas';
COMMENT ON COLUMN suppliers.bank_data IS 'Dados bancários do fornecedor para recebimento via Asaas';

-- 2) Estender tabela payments para Asaas e escrow
ALTER TABLE payments 
  ADD COLUMN payment_type text DEFAULT 'full' CHECK (payment_type IN ('full', 'advance', 'balance')),
  ADD COLUMN related_payment_id text REFERENCES payments(id),
  ADD COLUMN auto_release_enabled boolean DEFAULT true,
  ADD COLUMN release_reason text CHECK (release_reason IN ('client_confirmed', 'auto_release', 'admin_override', 'dispute_resolved')),
  ADD COLUMN asaas_payment_id text,
  ADD COLUMN asaas_invoice_url text,
  ADD COLUMN transfer_status text DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'scheduled', 'processing', 'completed', 'failed')),
  ADD COLUMN transfer_method text CHECK (transfer_method IN ('pix', 'ted', 'boleto', 'credit_card')),
  ADD COLUMN transfer_date timestamp with time zone,
  ADD COLUMN transfer_notes text;

-- Índices
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_asaas ON payments(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX idx_payments_transfer_status ON payments(transfer_status);
CREATE INDEX idx_payments_auto_release ON payments(auto_release_enabled) WHERE status = 'in_escrow';

COMMENT ON COLUMN payments.asaas_payment_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN payments.transfer_status IS 'Status da transferência para o fornecedor';
COMMENT ON COLUMN payments.payment_type IS 'Tipo: full (integral), advance (adiantamento), balance (saldo)';

-- 3) Adicionar campos de adiantamento nas cotações
ALTER TABLE quotes
  ADD COLUMN advance_payment_percentage numeric DEFAULT 0 CHECK (advance_payment_percentage >= 0 AND advance_payment_percentage <= 100),
  ADD COLUMN advance_payment_required boolean DEFAULT false;

CREATE INDEX idx_quotes_advance_required ON quotes(advance_payment_required) WHERE advance_payment_required = true;

COMMENT ON COLUMN quotes.advance_payment_percentage IS 'Percentual de adiantamento (0-100)';
COMMENT ON COLUMN quotes.advance_payment_required IS 'Se true, gera pagamento de adiantamento + saldo';

-- 4) Criar tabela de disputas
CREATE TABLE payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  opened_by uuid REFERENCES auth.users(id) NOT NULL,
  opened_by_role text NOT NULL CHECK (opened_by_role IN ('client', 'supplier', 'admin')),
  reason text NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved_release', 'resolved_refund', 'cancelled')),
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_disputes_payment ON payment_disputes(payment_id);
CREATE INDEX idx_disputes_status ON payment_disputes(status);

-- RLS para disputas
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver suas disputas"
  ON payment_disputes FOR SELECT
  USING (
    opened_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.id = payment_disputes.payment_id 
        AND p.client_id = get_current_user_client_id()
    )
  );

CREATE POLICY "Fornecedores podem ver disputas relacionadas"
  ON payment_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.id = payment_disputes.payment_id 
        AND p.supplier_id = get_current_user_supplier_id()
    )
  );

CREATE POLICY "Usuários podem criar disputas"
  ON payment_disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid());

CREATE POLICY "Admins têm controle total"
  ON payment_disputes FOR ALL
  USING (get_user_role() = 'admin');

-- 5) Inserir configurações do Asaas no system_settings
INSERT INTO system_settings (setting_key, description, setting_value) 
VALUES (
  'asaas_config',
  'Configurações da integração com Asaas (gateway de pagamentos)',
  '{
    "enabled": false,
    "mode": "sandbox",
    "api_key_configured": false,
    "webhook_configured": false,
    "platform_commission_percentage": 5.0,
    "auto_release_days": 7,
    "require_delivery_confirmation": true,
    "allow_disputes": true,
    "payment_methods_enabled": ["pix", "boleto", "credit_card"],
    "advance_payment_default_percentage": 30
  }'::jsonb
)
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    updated_at = now();