-- Remove a versão TEXT da função get_quote_timeline para eliminar ambiguidade
DROP FUNCTION IF EXISTS public.get_quote_timeline(text);

-- A versão UUID com local_code já existe da migração anterior
-- Apenas garantir que os privilégios estão corretos
GRANT EXECUTE ON FUNCTION public.get_quote_timeline(uuid) TO authenticated;