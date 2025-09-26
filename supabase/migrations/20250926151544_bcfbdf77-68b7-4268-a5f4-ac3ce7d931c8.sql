-- Verificar qual trigger está ativo na tabela quotes
SELECT 
    t.tgname as trigger_name,
    t.tgenabled,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.quotes'::regclass
ORDER BY t.tgname;

-- Verificar contadores atuais por cliente
SELECT 
    cqc.*,
    c.name as client_name
FROM client_quote_counters cqc
LEFT JOIN clients c ON c.id = cqc.client_id
ORDER BY cqc.updated_at DESC;