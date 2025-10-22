-- ============================================================================
-- Migration: Fix Quote Tokens Expiration
-- Created: 2025-10-22
-- Purpose: Revalidate existing tokens and fix expiration logic
-- ============================================================================

-- 1. Update recent tokens (last 30 days) that expired without being used
-- This fixes the issue where tokens were created with deadline date (midnight)
-- causing immediate expiration
UPDATE quote_tokens 
SET expires_at = created_at + INTERVAL '7 days'
WHERE 
  -- Tokens not yet used
  used_at IS NULL 
  -- Created in last 30 days
  AND created_at > NOW() - INTERVAL '30 days'
  -- Currently expired (the bug we're fixing)
  AND expires_at < NOW()
  -- Additional safety: only update if expiration was suspiciously close to creation
  AND (expires_at - created_at) < INTERVAL '1 day';

-- 2. Create function to validate token expiration is in the future
CREATE OR REPLACE FUNCTION validate_token_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure expires_at is always in the future when creating new tokens
  IF NEW.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Token expiration must be in the future. Got: %, Now: %', 
      NEW.expires_at, NOW();
  END IF;
  
  -- Ensure minimum validity period of 1 hour
  IF NEW.expires_at < NOW() + INTERVAL '1 hour' THEN
    RAISE WARNING 'Token validity period is less than 1 hour: %', 
      NEW.expires_at - NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger to validate on insert
DROP TRIGGER IF EXISTS trg_validate_token_expiration ON quote_tokens;
CREATE TRIGGER trg_validate_token_expiration
  BEFORE INSERT ON quote_tokens
  FOR EACH ROW
  EXECUTE FUNCTION validate_token_expiration();

-- 4. Add audit log for token fixes
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  created_at
)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user
  'TOKEN_EXPIRATION_FIXED',
  'quote_tokens',
  id::text,
  jsonb_build_object(
    'quote_id', quote_id,
    'old_expires_at', expires_at,
    'new_expires_at', created_at + INTERVAL '7 days',
    'reason', 'Automatic fix for immediate expiration bug'
  ),
  NOW()
FROM quote_tokens
WHERE 
  used_at IS NULL 
  AND created_at > NOW() - INTERVAL '30 days'
  AND expires_at < NOW()
  AND (expires_at - created_at) < INTERVAL '1 day';

-- 5. Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_quote_tokens_monitoring 
ON quote_tokens(created_at DESC, expires_at, used_at);

COMMENT ON INDEX idx_quote_tokens_monitoring IS 
  'Optimizes queries for token monitoring dashboard: creation date, expiration, usage tracking';