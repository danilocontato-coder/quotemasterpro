-- Drop existing function first, then recreate
DROP FUNCTION IF EXISTS public.get_invitation_letter_stats(uuid);

-- Recreate function with correct return structure
CREATE OR REPLACE FUNCTION public.get_invitation_letter_stats(p_letter_id uuid)
RETURNS TABLE(
  responses_count bigint,
  viewed_count bigint,
  accepted_count bigint,
  declined_count bigint,
  pending_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE response_status IS NOT NULL) as responses_count,
    COUNT(*) FILTER (WHERE viewed_at IS NOT NULL) as viewed_count,
    COUNT(*) FILTER (WHERE response_status = 'accepted') as accepted_count,
    COUNT(*) FILTER (WHERE response_status = 'declined') as declined_count,
    COUNT(*) FILTER (WHERE response_status = 'pending' OR response_status IS NULL) as pending_count
  FROM public.invitation_letter_suppliers
  WHERE invitation_letter_id = p_letter_id;
END;
$$;

COMMENT ON FUNCTION public.get_invitation_letter_stats IS 'Returns detailed stats for an invitation letter';
