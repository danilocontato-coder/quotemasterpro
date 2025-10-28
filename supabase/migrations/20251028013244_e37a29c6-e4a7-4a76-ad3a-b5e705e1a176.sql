-- =====================================================
-- Migration: Corrigir contadores de cotações e adicionar trigger de DELETE
-- Descrição: Recalcula quotes_this_month para todos os clientes e 
--            adiciona trigger para decrementar contador ao deletar cotações
-- =====================================================

-- 1) Recalcular quotes_this_month para todos os clientes
DO $$
DECLARE
  cliente RECORD;
  novo_contador INTEGER;
BEGIN
  FOR cliente IN 
    SELECT cu.id, cu.client_id, cu.quotes_this_month as old_count
    FROM client_usage cu
  LOOP
    -- Contar cotações reais deste mês
    SELECT COUNT(*)
    INTO novo_contador
    FROM quotes q
    WHERE q.client_id = cliente.client_id
      AND q.created_at >= date_trunc('month', CURRENT_DATE);
    
    -- Atualizar se diferente
    IF cliente.old_count != novo_contador THEN
      UPDATE client_usage
      SET quotes_this_month = novo_contador,
          updated_at = NOW()
      WHERE id = cliente.id;
      
      -- Log da correção
      INSERT INTO audit_logs (action, entity_type, entity_id, panel_type, details)
      VALUES (
        'USAGE_RECALCULATION',
        'client_usage',
        cliente.id::text,
        'system',
        jsonb_build_object(
          'client_id', cliente.client_id,
          'old_quotes_this_month', cliente.old_count,
          'new_quotes_this_month', novo_contador,
          'reason', 'Migration: Fix incorrect quote counters',
          'timestamp', NOW()
        )
      );
      
      RAISE NOTICE 'Cliente %: % -> % cotações', cliente.client_id, cliente.old_count, novo_contador;
    END IF;
  END LOOP;
END $$;

-- 2) Criar função para decrementar contador ao deletar cotação
CREATE OR REPLACE FUNCTION decrement_client_usage_on_quote_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE client_usage
  SET quotes_this_month = GREATEST(0, quotes_this_month - 1),
      updated_at = NOW()
  WHERE client_id = OLD.client_id;
  
  RAISE LOG 'Decrementado quotes_this_month para client_id=%', OLD.client_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Criar trigger (DROP IF EXISTS para evitar erro se já existir)
DROP TRIGGER IF EXISTS trigger_decrement_usage_on_quote_delete ON quotes;

CREATE TRIGGER trigger_decrement_usage_on_quote_delete
AFTER DELETE ON quotes
FOR EACH ROW
EXECUTE FUNCTION decrement_client_usage_on_quote_delete();

-- 4) Criar função de verificação de integridade
CREATE OR REPLACE FUNCTION check_usage_integrity()
RETURNS TABLE(
  client_id uuid,
  client_name text,
  stored_count integer,
  actual_count bigint,
  difference integer
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    cu.quotes_this_month,
    COUNT(q.id),
    (cu.quotes_this_month - COUNT(q.id))::integer as diff
  FROM clients c
  JOIN client_usage cu ON cu.client_id = c.id
  LEFT JOIN quotes q ON q.client_id = c.id 
    AND q.created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY c.id, c.name, cu.quotes_this_month
  HAVING cu.quotes_this_month != COUNT(q.id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_usage_integrity() IS 'Verifica discrepâncias entre contadores armazenados e contagens reais de cotações';

-- Log final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: contadores recalculados, trigger de DELETE criado, função de integridade disponível';
END $$;