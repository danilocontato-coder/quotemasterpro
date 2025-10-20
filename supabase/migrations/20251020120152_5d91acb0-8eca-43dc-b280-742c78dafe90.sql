-- Corrigir constraint de status em ai_negotiations para incluir 'analyzed' e 'not_viable'
ALTER TABLE public.ai_negotiations
DROP CONSTRAINT IF EXISTS ai_negotiations_status_check;

ALTER TABLE public.ai_negotiations
ADD CONSTRAINT ai_negotiations_status_check
CHECK (status IN ('analyzing', 'analyzed', 'not_viable', 'negotiating', 'completed', 'failed', 'approved', 'rejected'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.ai_negotiations.status IS 
'Status da negociação:
- analyzing: Análise em andamento
- analyzed: Análise concluída, aguardando ação do usuário
- not_viable: Análise concluída mas negociação não é viável
- negotiating: Negociação em andamento
- completed: Negociação concluída com sucesso
- failed: Negociação falhou
- approved: Negociação aprovada manualmente
- rejected: Negociação rejeitada manualmente';

-- Limpar registros órfãos com status inválido (opcional, apenas registros antigos)
DELETE FROM public.ai_negotiations
WHERE status NOT IN ('analyzing', 'analyzed', 'not_viable', 'negotiating', 'completed', 'failed', 'approved', 'rejected')
AND created_at < NOW() - INTERVAL '24 hours';