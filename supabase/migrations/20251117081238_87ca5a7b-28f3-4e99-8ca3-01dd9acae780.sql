-- Fase 6: Habilitar realtime para a tabela deliveries
ALTER TABLE deliveries REPLICA IDENTITY FULL;

-- Verificar se a configuração foi aplicada
SELECT relreplident FROM pg_class WHERE relname = 'deliveries';