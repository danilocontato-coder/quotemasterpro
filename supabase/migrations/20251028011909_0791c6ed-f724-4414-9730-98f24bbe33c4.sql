-- Fix security warnings: Add search_path to functions created in previous migration

-- Fix get_current_user_plan function
CREATE OR REPLACE FUNCTION get_current_user_plan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix sync_client_subscription_plan function
CREATE OR REPLACE FUNCTION sync_client_subscription_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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