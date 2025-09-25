-- Criar função para testar permissões de branding
CREATE OR REPLACE FUNCTION public.test_branding_permissions()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tentar inserir uma configuração de teste
  INSERT INTO public.system_settings (setting_key, setting_value, description) 
  VALUES ('branding_test_permission', '{"test": true}', 'Teste de permissão de branding')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value, 
    updated_at = now();
  
  -- Se chegou até aqui, tem permissão
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Se deu erro, não tem permissão
    RETURN false;
END;
$$;

-- Testar a função
SELECT test_branding_permissions() as has_branding_permission;