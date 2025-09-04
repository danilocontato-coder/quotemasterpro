-- Fix RLS policies for supplier quote access

-- Add missing SELECT policy for quote_responses for suppliers
DROP POLICY IF EXISTS "quote_responses_select" ON public.quote_responses;
CREATE POLICY "quote_responses_select" ON public.quote_responses
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    supplier_id IN (
      SELECT profiles.supplier_id FROM profiles WHERE profiles.id = auth.uid()
    ) OR
    -- Allow viewing responses for quotes visible to this supplier
    quote_id IN (
      SELECT q.id FROM quotes q 
      JOIN quote_suppliers qs ON q.id = qs.quote_id 
      WHERE qs.supplier_id = get_current_user_supplier_id()
    )
  );

-- Ensure quotes have proper SELECT policy for suppliers via quote_suppliers table
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    client_id IN (
      SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
    ) OR 
    supplier_id = get_current_user_supplier_id() OR 
    created_by = auth.uid() OR 
    -- Allow suppliers to see quotes assigned to them via quote_suppliers
    id IN (
      SELECT qs.quote_id FROM quote_suppliers qs 
      WHERE qs.supplier_id = get_current_user_supplier_id()
    ) OR
    -- Allow suppliers to see quotes they have responded to
    EXISTS (
      SELECT 1 FROM quote_responses qr 
      WHERE qr.quote_id = quotes.id AND qr.supplier_id = get_current_user_supplier_id()
    ) OR
    -- Allow suppliers to see global scope quotes that are sent/receiving
    (supplier_scope = 'global' AND status IN ('sent', 'receiving')) OR
    -- Allow suppliers to see local scope quotes without specific assignment
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent', 'receiving'))
  );

-- Update sample quotes to have proper scope and status
UPDATE public.quotes 
SET 
  supplier_scope = 'local',
  status = 'sent'
WHERE id IN ('RFQ02', 'RFQ03');

-- Add some debug data to help identify the issue - let's check current quote data
-- This will show what quotes exist and their properties
SELECT 
  'Current quotes:' as info,
  id, 
  title, 
  status, 
  supplier_scope,
  client_id,
  supplier_id,
  created_at
FROM quotes 
WHERE id IN ('RFQ02', 'RFQ03');