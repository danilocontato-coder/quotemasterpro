-- =====================================================
-- MIGRATION: Correção Completa do Sistema Financeiro
-- Data: 2025-11-24
-- Objetivo: Corrigir valores + numeração + proteções
-- =====================================================

-- 1️⃣ CORRIGIR VALORES FINANCEIROS
-- Recalcular supplier_net_amount em todos os pagamentos
UPDATE payments
SET supplier_net_amount = base_amount - platform_commission - asaas_fee,
    updated_at = now()
WHERE supplier_net_amount IS NOT NULL;

-- 2️⃣ CORRIGIR NUMERAÇÃO PAY (com FK fix transacional)
-- Desabilitar constraint temporariamente
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_payment_id_fkey;

-- Renumerar o pagamento
UPDATE payments
SET id = 'PAY006',
    updated_at = now()
WHERE id = 'PAY044578';

-- Atualizar referências em deliveries
UPDATE deliveries
SET payment_id = 'PAY006'
WHERE payment_id = 'PAY044578';

-- Recriar constraint
ALTER TABLE deliveries
ADD CONSTRAINT deliveries_payment_id_fkey
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

-- Atualizar contador do cliente
UPDATE client_payment_counters
SET current_counter = 6,
    updated_at = now()
WHERE client_id = '7133eb9b-59d9-4c96-877a-9a652e297728';

-- 3️⃣ SUBSTITUIR FUNÇÃO DE GERAÇÃO
-- Remover função bugada
DROP FUNCTION IF EXISTS public.generate_friendly_payment_id() CASCADE;

-- Atualizar trigger
CREATE OR REPLACE FUNCTION public.trg_payments_generate_friendly_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL OR BTRIM(NEW.id) = '' OR NEW.id LIKE '#PG%' OR NEW.id LIKE 'PG%' THEN
    NEW.id := public.next_payment_id_by_client(NEW.client_id, 'PAY');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_payments_generate_friendly_id() IS 
  'Gera IDs sequenciais PAY por cliente usando contador atômico';

-- 4️⃣ ADICIONAR CONSTRAINT DE PROTEÇÃO
ALTER TABLE payments
ADD CONSTRAINT check_supplier_net_valid 
CHECK (
  supplier_net_amount IS NULL OR
  ABS(supplier_net_amount - (base_amount - platform_commission - asaas_fee)) < 0.01
);

COMMENT ON CONSTRAINT check_supplier_net_valid ON payments IS 
  'Garante que supplier_net_amount = base_amount - commission - asaas_fee (com tolerância de R$ 0,01 para arredondamento)';

-- 5️⃣ VALIDAÇÃO FINAL
DO $$
DECLARE
  incorrect_count INTEGER;
BEGIN
  -- Verificar valores incorretos
  SELECT COUNT(*) INTO incorrect_count
  FROM payments
  WHERE supplier_net_amount IS NOT NULL
    AND ABS(supplier_net_amount - (base_amount - platform_commission - asaas_fee)) >= 0.01;
  
  IF incorrect_count > 0 THEN
    RAISE EXCEPTION 'FALHA NA VALIDAÇÃO: % pagamentos ainda têm valores incorretos', incorrect_count;
  END IF;
  
  RAISE NOTICE '✅ VALIDAÇÃO COMPLETA: Todos os valores financeiros estão corretos!';
  RAISE NOTICE '✅ PAY044578 renomeado para PAY006 com sucesso!';
  RAISE NOTICE '✅ Função de geração de IDs atualizada para usar next_payment_id_by_client!';
  RAISE NOTICE '✅ Constraint de proteção adicionada!';
END $$;