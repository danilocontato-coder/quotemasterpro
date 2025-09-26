-- Verificar se o trigger existe e está ativo
SELECT 
    t.tgname as trigger_name,
    t.tgenabled,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'quotes' AND t.tgname LIKE '%quote%id%';

-- Verificar se a função de ID por cliente existe
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name LIKE '%quote%id%' AND routine_schema = 'public';