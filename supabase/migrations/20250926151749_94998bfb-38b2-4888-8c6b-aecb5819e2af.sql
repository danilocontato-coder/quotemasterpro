-- Inserir contadores para clientes que ainda não possuem
INSERT INTO public.client_quote_counters (client_id, current_counter)
SELECT DISTINCT 
    q.client_id,
    COALESCE(MAX(CAST(SUBSTRING(q.id FROM '[0-9]+') AS INTEGER)), 0) as max_number
FROM public.quotes q
LEFT JOIN public.client_quote_counters cqc ON cqc.client_id = q.client_id
WHERE cqc.client_id IS NULL 
    AND q.id ~ '^RFQ[0-9]+$'
GROUP BY q.client_id
ON CONFLICT (client_id) DO NOTHING;

-- Verificar contadores finais
SELECT 
    cqc.*,
    c.name as client_name
FROM public.client_quote_counters cqc
LEFT JOIN public.clients c ON c.id = cqc.client_id
ORDER BY c.name;