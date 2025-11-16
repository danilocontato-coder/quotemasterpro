-- =====================================================
-- Fase 3: Adicionar campo required_documents à invitation_letters
-- =====================================================

-- Adicionar campo required_documents à tabela invitation_letters
ALTER TABLE public.invitation_letters
ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.invitation_letters.required_documents IS 
'Lista de documentos obrigatórios para a carta convite. Formato: [{"type": "cnpj", "label": "Cartão CNPJ", "mandatory": true}]';

-- Índice para melhor performance em queries que filtram por documentos obrigatórios
CREATE INDEX IF NOT EXISTS idx_invitation_letters_required_documents 
ON public.invitation_letters USING GIN(required_documents);