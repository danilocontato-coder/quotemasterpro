-- Fix RLS policy conflict with triggers for supplier creation
BEGIN;

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "suppliers_client_create" ON public.suppliers;

-- Create a more permissive INSERT policy that works with triggers
-- The trigger will set client_id automatically, so we allow NULL on insert
CREATE POLICY "suppliers_client_create_fixed"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_current_user_client_id() IS NOT NULL
  -- Allow client_id to be NULL since trigger will fill it
  -- Only check that user has a valid client context
);

-- Update the trigger to ensure it sets client_id properly and add debugging
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_client_id uuid;
BEGIN
  -- Get current user's client_id
  current_client_id := public.get_current_user_client_id();
  
  -- Always set client_id for new suppliers (even if provided)
  IF current_client_id IS NOT NULL THEN
    NEW.client_id := current_client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists and fires before insert
DROP TRIGGER IF EXISTS before_suppliers_set_client_id ON public.suppliers;
CREATE TRIGGER before_suppliers_set_client_id
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_set_client_id();

-- Also ensure the client_suppliers association trigger works
CREATE OR REPLACE FUNCTION public.trg_link_client_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create association if client_id is set and doesn't exist yet
  IF NEW.client_id IS NOT NULL THEN
    INSERT INTO public.client_suppliers (client_id, supplier_id, status)
    VALUES (NEW.client_id, NEW.id, 'active')
    ON CONFLICT (client_id, supplier_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMIT;