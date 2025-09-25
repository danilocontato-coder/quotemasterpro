-- Limpar função de teste que não é mais necessária
DROP FUNCTION IF EXISTS public.test_branding_permissions();

-- Remover configuração de teste 
DELETE FROM public.system_settings WHERE setting_key = 'branding_test_permission';