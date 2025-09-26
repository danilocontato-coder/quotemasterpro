-- Fix security vulnerability: Restrict coupons table to authenticated users only
-- First drop all existing policies and recreate them properly

-- Enable RLS on coupons table if not already enabled
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'coupons' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.coupons';
    END LOOP;
END $$;

-- Create proper RLS policies for coupons table
-- Only admins can manage coupons (full access)
CREATE POLICY "coupons_admin_full_access" 
ON public.coupons 
FOR ALL 
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- Authenticated users can only validate coupons (SELECT for validation purposes)
-- This allows the validation function to work but doesn't expose sensitive data directly
CREATE POLICY "coupons_authenticated_validation" 
ON public.coupons 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND starts_at <= now()
);

-- Log the security fix
INSERT INTO public.audit_logs (
  action,
  entity_type,
  entity_id,
  panel_type,
  details
) VALUES (
  'SECURITY_FIX_APPLIED',
  'coupons',
  'coupons_table',
  'system',
  jsonb_build_object(
    'issue', 'PUBLIC_COUPON_DATA',
    'description', 'Fixed public exposure of coupons table',
    'fix_applied', 'Restricted access to authenticated users only',
    'policies_created', jsonb_build_array('coupons_admin_full_access', 'coupons_authenticated_validation'),
    'timestamp', now()
  )
);