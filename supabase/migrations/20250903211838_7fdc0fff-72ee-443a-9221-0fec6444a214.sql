-- Remove test suppliers and all related data
DO $$
DECLARE
    supplier_alpha UUID;
    supplier_beta UUID;
    supplier_gamma UUID;
BEGIN
    -- Get the supplier IDs
    SELECT id INTO supplier_alpha FROM public.suppliers WHERE name = 'Alpha Materiais de Construção' OR cnpj = '22.333.444/0001-55' LIMIT 1;
    SELECT id INTO supplier_beta FROM public.suppliers WHERE name = 'Beta Limpeza Profissional' OR cnpj = '33.444.555/0001-66' LIMIT 1;
    SELECT id INTO supplier_gamma FROM public.suppliers WHERE name = 'Gamma Jardinagem' OR cnpj = '44.555.666/0001-77' LIMIT 1;
    
    -- Remove Alpha supplier and all references
    IF supplier_alpha IS NOT NULL THEN
        DELETE FROM public.payments WHERE supplier_id = supplier_alpha;
        UPDATE public.profiles SET supplier_id = NULL WHERE supplier_id = supplier_alpha;
        UPDATE public.users SET supplier_id = NULL WHERE supplier_id = supplier_alpha;
        UPDATE public.quotes SET supplier_id = NULL WHERE supplier_id = supplier_alpha;
        UPDATE public.quote_responses SET supplier_id = NULL WHERE supplier_id = supplier_alpha;
        DELETE FROM public.suppliers WHERE id = supplier_alpha;
    END IF;
    
    -- Remove Beta supplier and all references
    IF supplier_beta IS NOT NULL THEN
        DELETE FROM public.payments WHERE supplier_id = supplier_beta;
        UPDATE public.profiles SET supplier_id = NULL WHERE supplier_id = supplier_beta;
        UPDATE public.users SET supplier_id = NULL WHERE supplier_id = supplier_beta;
        UPDATE public.quotes SET supplier_id = NULL WHERE supplier_id = supplier_beta;
        UPDATE public.quote_responses SET supplier_id = NULL WHERE supplier_id = supplier_beta;
        DELETE FROM public.suppliers WHERE id = supplier_beta;
    END IF;
    
    -- Remove Gamma supplier and all references
    IF supplier_gamma IS NOT NULL THEN
        DELETE FROM public.payments WHERE supplier_id = supplier_gamma;
        UPDATE public.profiles SET supplier_id = NULL WHERE supplier_id = supplier_gamma;
        UPDATE public.users SET supplier_id = NULL WHERE supplier_id = supplier_gamma;
        UPDATE public.quotes SET supplier_id = NULL WHERE supplier_id = supplier_gamma;
        UPDATE public.quote_responses SET supplier_id = NULL WHERE supplier_id = supplier_gamma;
        DELETE FROM public.suppliers WHERE id = supplier_gamma;
    END IF;
END $$;