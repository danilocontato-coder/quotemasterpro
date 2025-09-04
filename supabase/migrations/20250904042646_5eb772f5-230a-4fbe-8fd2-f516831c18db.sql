-- Add max_amount_threshold column to approval_levels table
ALTER TABLE public.approval_levels 
ADD COLUMN max_amount_threshold numeric DEFAULT 999999999;

-- Add comment to the column
COMMENT ON COLUMN public.approval_levels.max_amount_threshold IS 'Maximum amount threshold for this approval level';

-- Update existing records to have proper max values
UPDATE public.approval_levels 
SET max_amount_threshold = CASE 
  WHEN amount_threshold = 0 THEN 1000
  WHEN amount_threshold = 1001 THEN 5000  
  WHEN amount_threshold = 5001 THEN 20000
  WHEN amount_threshold = 20001 THEN 999999999
  ELSE 999999999
END;