-- Adicionar foreign key entre deliveries e quotes
ALTER TABLE public.deliveries 
ADD CONSTRAINT deliveries_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

-- Verificar se existem dados órfãos antes de criar a constraint
-- Se houver erro, será necessário limpar dados inconsistentes primeiro