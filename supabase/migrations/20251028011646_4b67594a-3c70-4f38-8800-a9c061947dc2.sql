-- Migration: Fix subscription plan inconsistency between clients and subscriptions tables
-- Establishes subscriptions table as single source of truth

-- 1. Drop existing function to allow return type change
DROP FUNCTION IF EXISTS get_current_user_plan();

-- 2. Create updated get_current_user_plan() RPC using subscriptions as source of truth
CREATE OR REPLACE FUNCTION get_current_user_plan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_client_id UUID;
  user_supplier_id UUID;
  plan_data jsonb;
BEGIN
  -- Get user information from profiles
  SELECT role, client_id, supplier_id
  INTO user_role, user_client_id, user_supplier_id
  FROM profiles
  WHERE id = auth.uid();

  -- If client role, fetch from subscriptions table (SINGLE SOURCE OF TRUTH)
  IF user_role IN ('manager', 'collaborator', 'admin_cliente') THEN
    SELECT to_jsonb(sp.*)
    INTO plan_data
    FROM subscriptions s
    INNER JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.client_id = user_client_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    RETURN plan_data;
  END IF;

  -- If supplier role, fetch from suppliers table
  IF user_role = 'supplier' THEN
    SELECT to_jsonb(sp.*)
    INTO plan_data
    FROM suppliers sup
    INNER JOIN subscription_plans sp ON sup.subscription_plan_id = sp.id
    WHERE sup.id = user_supplier_id;
    
    RETURN plan_data;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Create trigger function to sync clients.subscription_plan_id with subscriptions.plan_id
CREATE OR REPLACE FUNCTION sync_client_subscription_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_plan_id TEXT;
BEGIN
  -- When a subscription is created or updated to 'active'
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'active' THEN
    -- Update clients.subscription_plan_id
    UPDATE clients
    SET subscription_plan_id = NEW.plan_id,
        updated_at = NOW()
    WHERE id = NEW.client_id;
    
    -- Add audit log
    INSERT INTO audit_logs (
      user_id,
      action,
      panel_type,
      entity_type,
      entity_id,
      details,
      created_at
    ) VALUES (
      auth.uid(),
      'SUBSCRIPTION_SYNC',
      'system',
      'clients',
      NEW.client_id::text,
      jsonb_build_object(
        'subscription_id', NEW.id,
        'new_plan_id', NEW.plan_id,
        'reason', 'subscription_activated',
        'trigger', 'sync_client_subscription_plan'
      ),
      NOW()
    );
  END IF;

  -- When a subscription is cancelled or expired
  IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled', 'expired') AND OLD.status = 'active' THEN
    -- Check if there's another active subscription
    SELECT plan_id INTO new_plan_id
    FROM subscriptions
    WHERE client_id = NEW.client_id
      AND status = 'active'
      AND id != NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF new_plan_id IS NOT NULL THEN
      -- Update to the next active subscription
      UPDATE clients
      SET subscription_plan_id = new_plan_id,
          updated_at = NOW()
      WHERE id = NEW.client_id;
      
      -- Add audit log
      INSERT INTO audit_logs (
        user_id,
        action,
        panel_type,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        auth.uid(),
        'SUBSCRIPTION_SYNC',
        'system',
        'clients',
        NEW.client_id::text,
        jsonb_build_object(
          'old_subscription_id', NEW.id,
          'new_plan_id', new_plan_id,
          'reason', 'previous_subscription_cancelled',
          'trigger', 'sync_client_subscription_plan'
        ),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger on subscriptions table
DROP TRIGGER IF EXISTS trigger_sync_client_subscription_plan ON subscriptions;
CREATE TRIGGER trigger_sync_client_subscription_plan
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_subscription_plan();

-- 5. Fix existing inconsistent data
-- Update clients.subscription_plan_id based on active subscriptions
UPDATE clients c
SET subscription_plan_id = s.plan_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (client_id) 
    client_id, 
    plan_id
  FROM subscriptions
  WHERE status = 'active'
  ORDER BY client_id, created_at DESC
) s
WHERE c.id = s.client_id
  AND (c.subscription_plan_id IS NULL OR c.subscription_plan_id != s.plan_id);

-- 6. Add audit logs for fixed data
INSERT INTO audit_logs (
  user_id,
  action,
  panel_type,
  entity_type,
  entity_id,
  details,
  created_at
)
SELECT
  NULL,
  'SUBSCRIPTION_SYNC',
  'system',
  'clients',
  c.id::text,
  jsonb_build_object(
    'old_plan_id', c.subscription_plan_id,
    'new_plan_id', s.plan_id,
    'reason', 'migration_data_fix',
    'migration', 'fix_subscription_plan_inconsistency'
  ),
  NOW()
FROM clients c
INNER JOIN (
  SELECT DISTINCT ON (client_id) 
    client_id, 
    plan_id
  FROM subscriptions
  WHERE status = 'active'
  ORDER BY client_id, created_at DESC
) s ON s.client_id = c.id
WHERE c.subscription_plan_id != s.plan_id;