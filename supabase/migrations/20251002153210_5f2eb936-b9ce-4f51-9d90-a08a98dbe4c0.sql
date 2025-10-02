-- Get current user's plan ignoring status RLS restrictions, limited to their own client/supplier
CREATE OR REPLACE FUNCTION public.get_current_user_plan()
RETURNS public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_row public.subscription_plans;
  plan_id text;
BEGIN
  -- Identify the plan associated to the current user's client or supplier
  SELECT COALESCE(c.subscription_plan_id, s.subscription_plan_id)
  INTO plan_id
  FROM public.profiles p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.suppliers s ON s.id = p.supplier_id
  WHERE p.id = auth.uid();

  IF plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the plan row even if it's inactive (read via SECURITY DEFINER)
  SELECT * INTO plan_row
  FROM public.subscription_plans sp
  WHERE sp.id = plan_id
  LIMIT 1;

  RETURN plan_row;
END;
$$;