-- Verificar se existe trigger para atualizar items_count automaticamente
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    p.prosrc as function_code
FROM information_schema.triggers t
LEFT JOIN pg_proc p ON p.proname = replace(t.action_statement, 'EXECUTE FUNCTION ', '')
WHERE t.event_object_table IN ('quote_items', 'quotes');