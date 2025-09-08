-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create ai_settings table to store AI configuration
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

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only super admins can manage AI settings
CREATE POLICY "Super admins can view AI settings" 
ON public.ai_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can manage AI settings" 
ON public.ai_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.ai_settings (negotiation_provider, market_analysis_provider, openai_model) 
VALUES ('openai', 'perplexity', 'gpt-5-2025-08-07')
ON CONFLICT DO NOTHING;