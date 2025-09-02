-- Create edge function for creating auth users
-- This will be handled by the edge function since admin functions need service role

-- Add a helper function to validate user creation
CREATE OR REPLACE FUNCTION public.validate_user_creation(
  user_email text,
  user_role text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'Email já existe na base de dados';
  END IF;
  
  -- Validate role
  IF user_role NOT IN ('admin', 'manager', 'collaborator', 'supplier') THEN
    RAISE EXCEPTION 'Papel inválido: %', user_role;
  END IF;
  
  RETURN true;
END;
$$;