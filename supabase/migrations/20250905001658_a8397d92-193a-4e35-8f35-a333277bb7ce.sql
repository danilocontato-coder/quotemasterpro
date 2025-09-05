-- Allow client-side members (manager/collaborator) to view quote_responses of quotes they can see
-- Uses existing security-definer function public.current_user_can_see_quote(quote_id text)

-- Safety: recreate policy idempotently
DROP POLICY IF EXISTS "quote_responses_select_client" ON public.quote_responses;

CREATE POLICY "quote_responses_select_client"
ON public.quote_responses
FOR SELECT
TO authenticated
USING (
  public.current_user_can_see_quote(quote_id)
);
