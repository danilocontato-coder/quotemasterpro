-- Create ai_settings table to store AI configuration (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_provider TEXT NOT NULL DEFAULT 'openai',
  market_analysis_provider TEXT NOT NULL DEFAULT 'perplexity',
  openai_model TEXT NOT NULL DEFAULT 'gpt-5-2025-08-07',
  perplexity_model TEXT NOT NULL DEFAULT 'llama-3.1-sonar-large-128k-online',
  max_discount_percent INTEGER NOT NULL DEFAULT 15,
  min_negotiation_amount DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  aggressiveness TEXT NOT NULL DEFAULT 'moderate',
  auto_analysis BOOLEAN NOT NULL DEFAULT true,
  auto_negotiation BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS only if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'ai_settings' 
    AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Insert default configuration only if table is empty
INSERT INTO public.ai_settings (negotiation_provider, market_analysis_provider, openai_model) 
SELECT 'openai', 'perplexity', 'gpt-5-2025-08-07'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_settings LIMIT 1);