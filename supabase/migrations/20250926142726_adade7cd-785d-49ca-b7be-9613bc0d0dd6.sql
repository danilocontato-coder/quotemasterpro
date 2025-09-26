-- Remover função de convite para certificação que não é mais necessária
DROP FUNCTION IF EXISTS public.invite_supplier_certification(text, text);
DROP FUNCTION IF EXISTS public.invite_supplier_certification(text, text, text);