-- Create user_settings table for profile and notification preferences
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile settings
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  company_name TEXT,
  
  -- Notification preferences
  notifications JSONB NOT NULL DEFAULT '{
    "email": true,
    "whatsapp": false,
    "newQuotes": true,
    "approvals": true,
    "payments": true,
    "lowStock": false
  }'::jsonb,
  
  -- System preferences
  preferences JSONB NOT NULL DEFAULT '{
    "language": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "currency": "BRL",
    "theme": "light"
  }'::jsonb,
  
  -- Security settings
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method TEXT DEFAULT 'sms',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create trigger to update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to get or create user settings
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(user_uuid UUID)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record public.user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record
  FROM public.user_settings
  WHERE user_id = user_uuid;
  
  -- If no settings exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (user_uuid)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;