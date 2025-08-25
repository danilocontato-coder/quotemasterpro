-- Allow proper deletion of quotes by creators and admins
-- Create DELETE policy for public.quotes
CREATE POLICY quotes_delete
ON public.quotes
FOR DELETE
USING (
  -- Admins can delete any quote
  (get_user_role() = 'admin') OR
  -- Creators can delete their own draft quotes within their client scope
  (
    status = 'draft'
    AND (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
    AND (created_by = auth.uid())
  )
);

-- Optional but helpful for realtime DELETE payloads to include full row (safety)
ALTER TABLE public.quotes REPLICA IDENTITY FULL;