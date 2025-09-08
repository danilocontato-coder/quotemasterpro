-- CORREÇÕES CRÍTICAS DE SEGURANÇA
-- 1. Restringir acesso público a tabelas sensíveis

-- Remover acesso público aos planos de assinatura
DROP POLICY IF EXISTS "subscription_plans_public_select" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_select" ON public.subscription_plans;

-- Política restrita para planos de assinatura
CREATE POLICY "subscription_plans_authenticated_select" 
ON public.subscription_plans 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Remover acesso público aos grupos de clientes
DROP POLICY IF EXISTS "client_groups_select_authenticated" ON public.client_groups;

-- Política restrita para grupos de clientes
CREATE POLICY "client_groups_restricted_select" 
ON public.client_groups 
FOR SELECT 
USING (get_user_role() = 'admin'::text);

-- Restringir acesso aos prompts de IA
DROP POLICY IF EXISTS "ai_prompts_client" ON public.ai_prompts;

-- Política mais restritiva para prompts de IA
CREATE POLICY "ai_prompts_restricted_access" 
ON public.ai_prompts 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

-- Restringir templates de WhatsApp
DROP POLICY IF EXISTS "whatsapp_templates_client_select" ON public.whatsapp_templates;

-- Política mais restritiva para templates WhatsApp
CREATE POLICY "whatsapp_templates_restricted_select" 
ON public.whatsapp_templates 
FOR SELECT 
USING (
  (get_user_role() = 'admin'::text) OR 
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()))
);

-- Restringir grupos de usuários
DROP POLICY IF EXISTS "user_groups_authenticated_only" ON public.user_groups;
DROP POLICY IF EXISTS "user_groups_select" ON public.user_groups;

-- Política mais restritiva para grupos de usuários
CREATE POLICY "user_groups_restricted_select" 
ON public.user_groups 
FOR SELECT 
USING (get_user_role() = 'admin'::text);

-- 2. Corrigir funções com search_path inseguro
CREATE OR REPLACE FUNCTION public.update_group_user_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update the user count for the affected group(s)
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_groups 
    SET user_count = (
      SELECT COUNT(*) 
      FROM public.user_group_memberships 
      WHERE group_id = NEW.group_id
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_groups 
    SET user_count = (
      SELECT COUNT(*) 
      FROM public.user_group_memberships 
      WHERE group_id = OLD.group_id
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_group_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Atualizar contagem quando cliente é inserido
  IF TG_OP = 'INSERT' AND NEW.group_id IS NOT NULL THEN
    UPDATE public.client_groups 
    SET client_count = (
      SELECT COUNT(*) FROM public.clients WHERE group_id = NEW.group_id
    )
    WHERE id = NEW.group_id;
  END IF;
  
  -- Atualizar contagem quando cliente é atualizado
  IF TG_OP = 'UPDATE' THEN
    IF OLD.group_id IS NOT NULL THEN
      UPDATE public.client_groups 
      SET client_count = (
        SELECT COUNT(*) FROM public.clients WHERE group_id = OLD.group_id
      )
      WHERE id = OLD.group_id;
    END IF;
    
    IF NEW.group_id IS NOT NULL AND NEW.group_id != OLD.group_id THEN
      UPDATE public.client_groups 
      SET client_count = (
        SELECT COUNT(*) FROM public.clients WHERE group_id = NEW.group_id
      )
      WHERE id = NEW.group_id;
    END IF;
  END IF;
  
  -- Atualizar contagem quando cliente é removido
  IF TG_OP = 'DELETE' AND OLD.group_id IS NOT NULL THEN
    UPDATE public.client_groups 
    SET client_count = (
      SELECT COUNT(*) FROM public.clients WHERE group_id = OLD.group_id
    )
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.coupons 
  SET usage_count = usage_count + 1
  WHERE id = NEW.coupon_id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Inicializar perfil automaticamente
  PERFORM public.initialize_user_profile(
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name'
  );
  
  RETURN NEW;
END;
$function$;