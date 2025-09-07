-- Adicionar campo group_id para agrupar comunicados enviados em lote
ALTER TABLE public.announcements ADD COLUMN announcement_group_id UUID DEFAULT gen_random_uuid();

-- Criar índice para melhor performance nas consultas agrupadas
CREATE INDEX idx_announcements_group_id ON public.announcements(announcement_group_id);

-- Atualizar registros existentes para ter o mesmo group_id se foram criados no mesmo momento
UPDATE public.announcements 
SET announcement_group_id = (
  SELECT gen_random_uuid() 
  FROM (SELECT DISTINCT title, content, created_by, DATE_TRUNC('minute', created_at) as minute_created 
        FROM public.announcements a2 
        WHERE a2.title = announcements.title 
        AND a2.content = announcements.content 
        AND a2.created_by = announcements.created_by 
        AND DATE_TRUNC('minute', a2.created_at) = DATE_TRUNC('minute', announcements.created_at)
        LIMIT 1) as grouped
);