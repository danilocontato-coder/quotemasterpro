-- Fix quotes RLS policies to prevent infinite recursion
-- Drop all existing policies first
DROP POLICY IF EXISTS "quotes_delete" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "quotes_no_orphans" ON public.quotes;
DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update" ON public.quotes;

-- Create simplified, non-conflicting policies
-- 1. SELECT policy - simplified and efficient
CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'admin'::text 
  OR client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  OR supplier_id = get_current_user_supplier_id()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM quote_suppliers qs 
    WHERE qs.quote_id = quotes.id 
    AND qs.supplier_id = get_current_user_supplier_id()
  )
);

-- 2. INSERT policy - simplified
CREATE POLICY "quotes_insert_policy" ON public.quotes  
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
  AND client_id IS NOT NULL
);

-- 3. UPDATE policy - simplified  
CREATE POLICY "quotes_update_policy" ON public.quotes
FOR UPDATE 
TO authenticated
USING (
  get_user_role() = 'admin'::text
  OR (
    client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  )
);

-- 4. DELETE policy - simplified
CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE
TO authenticated  
USING (
  get_user_role() = 'admin'::text
  OR (
    status = 'draft'::text 
    AND client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  )
);