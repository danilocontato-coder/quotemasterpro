-- Fix search_path in security definer functions to improve security
-- This addresses the linter warnings about mutable search paths

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
  );
  RETURN NEW;
END;
$function$;

-- Fix check_user_email_exists function
CREATE OR REPLACE FUNCTION public.check_user_email_exists(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Verificar se existe na tabela users
  IF EXISTS (SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(user_email)) THEN
    RETURN true;
  END IF;
  
  -- Verificar se existe na tabela profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(user_email)) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Fix get_or_create_user_settings function
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(user_uuid uuid)
 RETURNS user_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix get_or_create_client_usage function
CREATE OR REPLACE FUNCTION public.get_or_create_client_usage(client_uuid uuid)
 RETURNS client_usage
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  usage_record public.client_usage;
BEGIN
  -- Primeiro, tenta resetar contadores se necessário
  PERFORM public.reset_monthly_usage();
  
  -- Busca registro existente
  SELECT * INTO usage_record
  FROM public.client_usage
  WHERE client_id = client_uuid;
  
  -- Se não existe, cria um novo
  IF NOT FOUND THEN
    INSERT INTO public.client_usage (client_id)
    VALUES (client_uuid)
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$function$;

-- Add function to get current user's supplier_id for better isolation
CREATE OR REPLACE FUNCTION public.get_current_user_supplier_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT supplier_id FROM public.profiles WHERE id = auth.uid();
$function$;

-- Improve supplier isolation in RLS policies
-- Update suppliers policy to ensure better isolation
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" 
ON public.suppliers 
FOR SELECT 
USING (
  get_user_role() = 'admin' 
  OR id = get_current_user_supplier_id()
  OR (status = 'active' AND get_user_role() != 'supplier')
);

-- Update products policy for better supplier isolation  
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select"
ON public.products
FOR SELECT
USING (
  get_user_role() = 'admin'
  OR client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())
  OR supplier_id = get_current_user_supplier_id()
);

-- Update quotes policy to ensure suppliers only see their assigned quotes
DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
CREATE POLICY "quotes_select"
ON public.quotes
FOR SELECT
USING (
  get_user_role() = 'admin'
  OR client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())
  OR supplier_id = get_current_user_supplier_id()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM quote_responses qr 
    WHERE qr.quote_id = quotes.id 
    AND qr.supplier_id = get_current_user_supplier_id()
  )
);

COMMENT ON FUNCTION public.get_current_user_supplier_id IS 'Returns the supplier_id for the current authenticated user for RLS isolation';