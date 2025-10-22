-- ========================================
-- FASE 1.2: Triggers de Contadores de Assinantes
-- ========================================

-- Função para atualizar contadores de assinantes
CREATE OR REPLACE FUNCTION update_plan_subscribers()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é INSERT e tem plan_id, incrementar
  IF (TG_OP = 'INSERT' AND NEW.subscription_plan_id IS NOT NULL) THEN
    UPDATE subscription_plans
    SET clients_subscribed = clients_subscribed + 1,
        updated_at = now()
    WHERE id = NEW.subscription_plan_id;
    RETURN NEW;
  END IF;

  -- Se é UPDATE e mudou o plan_id
  IF (TG_OP = 'UPDATE') THEN
    -- Decrementar do plano antigo (se existia)
    IF (OLD.subscription_plan_id IS NOT NULL AND 
        (NEW.subscription_plan_id IS NULL OR OLD.subscription_plan_id != NEW.subscription_plan_id)) THEN
      UPDATE subscription_plans
      SET clients_subscribed = GREATEST(0, clients_subscribed - 1),
          updated_at = now()
      WHERE id = OLD.subscription_plan_id;
    END IF;

    -- Incrementar no plano novo (se mudou)
    IF (NEW.subscription_plan_id IS NOT NULL AND 
        (OLD.subscription_plan_id IS NULL OR OLD.subscription_plan_id != NEW.subscription_plan_id)) THEN
      UPDATE subscription_plans
      SET clients_subscribed = clients_subscribed + 1,
          updated_at = now()
      WHERE id = NEW.subscription_plan_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Se é DELETE e tinha plan_id, decrementar
  IF (TG_OP = 'DELETE' AND OLD.subscription_plan_id IS NOT NULL) THEN
    UPDATE subscription_plans
    SET clients_subscribed = GREATEST(0, clients_subscribed - 1),
        updated_at = now()
    WHERE id = OLD.subscription_plan_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar contadores de fornecedores
CREATE OR REPLACE FUNCTION update_supplier_plan_subscribers()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é INSERT e tem plan_id, incrementar
  IF (TG_OP = 'INSERT' AND NEW.subscription_plan_id IS NOT NULL) THEN
    UPDATE subscription_plans
    SET suppliers_subscribed = suppliers_subscribed + 1,
        updated_at = now()
    WHERE id = NEW.subscription_plan_id;
    RETURN NEW;
  END IF;

  -- Se é UPDATE e mudou o plan_id
  IF (TG_OP = 'UPDATE') THEN
    -- Decrementar do plano antigo (se existia)
    IF (OLD.subscription_plan_id IS NOT NULL AND 
        (NEW.subscription_plan_id IS NULL OR OLD.subscription_plan_id != NEW.subscription_plan_id)) THEN
      UPDATE subscription_plans
      SET suppliers_subscribed = GREATEST(0, suppliers_subscribed - 1),
          updated_at = now()
      WHERE id = OLD.subscription_plan_id;
    END IF;

    -- Incrementar no plano novo (se mudou)
    IF (NEW.subscription_plan_id IS NOT NULL AND 
        (OLD.subscription_plan_id IS NULL OR OLD.subscription_plan_id != NEW.subscription_plan_id)) THEN
      UPDATE subscription_plans
      SET suppliers_subscribed = suppliers_subscribed + 1,
          updated_at = now()
      WHERE id = NEW.subscription_plan_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Se é DELETE e tinha plan_id, decrementar
  IF (TG_OP = 'DELETE' AND OLD.subscription_plan_id IS NOT NULL) THEN
    UPDATE subscription_plans
    SET suppliers_subscribed = GREATEST(0, suppliers_subscribed - 1),
        updated_at = now()
    WHERE id = OLD.subscription_plan_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS clients_plan_subscribers_trigger ON clients;
DROP TRIGGER IF EXISTS suppliers_plan_subscribers_trigger ON suppliers;

-- Criar triggers para clientes
CREATE TRIGGER clients_plan_subscribers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_subscribers();

-- Criar triggers para fornecedores
CREATE TRIGGER suppliers_plan_subscribers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_plan_subscribers();

-- ========================================
-- Recalcular contadores retroativamente
-- ========================================

-- Zerar todos os contadores primeiro
UPDATE subscription_plans
SET clients_subscribed = 0,
    suppliers_subscribed = 0,
    updated_at = now();

-- Recalcular clientes por plano
UPDATE subscription_plans sp
SET clients_subscribed = (
  SELECT COUNT(*)
  FROM clients c
  WHERE c.subscription_plan_id = sp.id
),
updated_at = now();

-- Recalcular fornecedores por plano
UPDATE subscription_plans sp
SET suppliers_subscribed = (
  SELECT COUNT(*)
  FROM suppliers s
  WHERE s.subscription_plan_id = sp.id
),
updated_at = now();

-- Log de auditoria
DO $$
BEGIN
  RAISE NOTICE 'Triggers de contadores de assinantes criados com sucesso';
  RAISE NOTICE 'Contadores recalculados retroativamente';
END $$;