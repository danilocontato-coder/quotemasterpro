-- Remover fornecedor genérico desnecessário
DELETE FROM public.suppliers 
WHERE name = 'Fornecedor Genérico - Empresa Teste' 
  AND cnpj = '00000000000003'
  AND email LIKE 'generico%@sistema.com';

-- Log da limpeza
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  panel_type, 
  details
) VALUES (
  'CLEANUP_GENERIC_SUPPLIER',
  'suppliers',
  '60602f1b-549a-4c8b-b4dc-dc61be61cbd7',
  'system',
  '{"message": "Fornecedor genérico removido - criado por engano durante migração"}'::jsonb
);