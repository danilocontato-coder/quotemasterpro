-- Adicionar coluna para armazenar análise IA das respostas em quote_messages
ALTER TABLE public.quote_messages
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;

-- Criar índice GIN para busca eficiente na análise IA
CREATE INDEX IF NOT EXISTS idx_quote_messages_ai_analysis 
ON public.quote_messages USING GIN (ai_analysis);

-- Comentário explicativo
COMMENT ON COLUMN public.quote_messages.ai_analysis IS 
'Análise contextual da IA sobre respostas incluindo scores de completude, clareza, red flags detectados e sugestões de follow-up. Usado para garantir qualidade das comunicações e prevenir negociações fora da plataforma.';