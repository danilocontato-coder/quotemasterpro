-- Re-enable RLS and fix the policy
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;

-- Create a new, more permissive insert policy for testing
CREATE POLICY "quotes_insert_policy_fixed" ON public.quotes
FOR INSERT 
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL 
  AND 
  -- created_by must match authenticated user
  created_by = auth.uid()
  AND
  -- client_id must be provided
  client_id IS NOT NULL
  AND
  -- User's profile must exist and have same client_id (avoiding recursive issue)
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.client_id = quotes.client_id
  )
);