-- Criar tabela para armazenar negociações da IA
CREATE TABLE public.ai_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  selected_response_id UUID REFERENCES public.quote_responses(id),
  original_amount NUMERIC NOT NULL,
  negotiated_amount NUMERIC,
  discount_percentage NUMERIC,
  negotiation_strategy JSONB DEFAULT '{}',
  conversation_log JSONB DEFAULT '[]',
  ai_analysis JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'negotiating', 'completed', 'failed', 'approved', 'rejected')),
  human_approved BOOLEAN DEFAULT NULL,
  human_feedback TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar novos status às cotações
ALTER TABLE public.quotes 
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'receiving', 'received', 'ai_analyzing', 'ai_negotiating', 'negotiation_completed', 'approved', 'rejected', 'finalized', 'cancelled'));

-- RLS para ai_negotiations
ALTER TABLE public.ai_negotiations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_negotiations
CREATE POLICY "ai_negotiations_select" ON public.ai_negotiations
FOR SELECT USING (
  (get_user_role() = 'admin'::text) OR 
  (EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = ai_negotiations.quote_id 
    AND q.client_id IN (
      SELECT profiles.client_id FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  ))
);

CREATE POLICY "ai_negotiations_insert" ON public.ai_negotiations
FOR INSERT WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = ai_negotiations.quote_id 
    AND q.client_id IN (
      SELECT profiles.client_id FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  ))
);

CREATE POLICY "ai_negotiations_update" ON public.ai_negotiations
FOR UPDATE USING (
  (get_user_role() = 'admin'::text) OR 
  (EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = ai_negotiations.quote_id 
    AND q.client_id IN (
      SELECT profiles.client_id FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  ))
);

-- Função para notificar sobre negociações
CREATE OR REPLACE FUNCTION public.notify_negotiation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
BEGIN
  -- Buscar informações da cotação
  SELECT * INTO quote_record FROM public.quotes WHERE id = NEW.quote_id;
  
  IF quote_record IS NOT NULL THEN
    CASE NEW.status
      WHEN 'completed' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Negociação IA Concluída',
          'A IA finalizou a negociação da cotação #' || NEW.quote_id || '. Desconto obtido: ' || COALESCE(NEW.discount_percentage, 0) || '%',
          'success',
          'high',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'negotiation_id', NEW.id, 'discount', NEW.discount_percentage)
        );
      WHEN 'failed' THEN
        PERFORM public.notify_client_users(
          quote_record.client_id,
          'Negociação IA Falhou',
          'A IA não conseguiu negociar a cotação #' || NEW.quote_id || '. Revisão manual necessária.',
          'warning',
          'normal',
          '/quotes',
          jsonb_build_object('quote_id', NEW.quote_id, 'negotiation_id', NEW.id)
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger para notificações
CREATE TRIGGER notify_negotiation_status_trigger
  AFTER UPDATE ON public.ai_negotiations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_negotiation_status();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_negotiations_updated_at
  BEFORE UPDATE ON public.ai_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Função para iniciar negociação automática quando cotação recebe todas as propostas
CREATE OR REPLACE FUNCTION public.trigger_ai_negotiation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a cotação mudou para 'received', iniciar análise da IA
  IF OLD.status != 'received' AND NEW.status = 'received' THEN
    -- Atualizar status da cotação para 'ai_analyzing'
    UPDATE public.quotes 
    SET status = 'ai_analyzing', updated_at = now()
    WHERE id = NEW.id;
    
    -- Criar registro de negociação
    INSERT INTO public.ai_negotiations (quote_id, original_amount, status)
    VALUES (NEW.id, NEW.total, 'analyzing');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger para iniciar negociação automática
CREATE TRIGGER trigger_ai_negotiation_on_quote_received
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_negotiation();