-- Adicionar função para criar aprovação manual após aprovação da IA
CREATE OR REPLACE FUNCTION public.trigger_manual_approval_after_ai()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  approval_check RECORD;
  applicable_level RECORD;
  final_amount NUMERIC;
BEGIN
  -- Só executar quando IA for aprovada por humano
  IF NEW.human_approved = true AND (OLD.human_approved IS NULL OR OLD.human_approved = false) THEN
    
    -- Buscar informações da cotação
    SELECT * INTO quote_record
    FROM public.quotes
    WHERE id = NEW.quote_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Usar valor negociado ou valor original
    final_amount := COALESCE(NEW.negotiated_amount, NEW.original_amount);
    
    -- Buscar nível de aprovação aplicável
    SELECT * INTO applicable_level
    FROM public.approval_levels
    WHERE client_id = quote_record.client_id
      AND final_amount >= min_amount
    ORDER BY min_amount DESC
    LIMIT 1;
    
    -- Se existe nível de aprovação aplicável, criar aprovação
    IF FOUND THEN
      
      -- Verificar se já existe aprovação para esta cotação
      SELECT * INTO approval_check
      FROM public.approvals
      WHERE quote_id = NEW.quote_id;
      
      -- Só criar se não existir
      IF NOT FOUND THEN
        
        -- Criar aprovação manual
        INSERT INTO public.approvals (
          quote_id,
          approver_id,
          status,
          comments
        ) VALUES (
          NEW.quote_id,
          applicable_level.approver_ids[1], -- Primeiro aprovador do nível
          'pending',
          format('Valor negociado pela IA: R$ %.2f (economia de R$ %.2f)', 
            final_amount, 
            NEW.original_amount - final_amount
          )
        );
        
        -- Atualizar status da cotação para aguardar aprovação manual
        UPDATE public.quotes
        SET 
          status = 'pending_approval',
          updated_at = now()
        WHERE id = NEW.quote_id;
        
        -- Criar notificação para aprovador
        PERFORM public.create_notification(
          applicable_level.approver_ids[1],
          'Nova Aprovação Necessária',
          format('Cotação %s negociada pela IA aguarda sua aprovação. Valor: R$ %.2f', 
            NEW.quote_id, 
            final_amount
          ),
          'approval',
          'high',
          '/approvals',
          jsonb_build_object(
            'quote_id', NEW.quote_id,
            'negotiated_amount', final_amount,
            'original_amount', NEW.original_amount,
            'savings', NEW.original_amount - final_amount
          )
        );
        
        RAISE NOTICE 'Aprovação manual criada para cotação % (valor: %)', NEW.quote_id, final_amount;
      END IF;
      
    ELSE
      -- Se não requer aprovação manual, aprovar automaticamente
      UPDATE public.quotes
      SET 
        status = 'approved',
        updated_at = now()
      WHERE id = NEW.quote_id;
      
      RAISE NOTICE 'Cotação % aprovada automaticamente (não requer aprovação manual)', NEW.quote_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após aprovação da IA
DROP TRIGGER IF EXISTS trg_ai_approval_creates_manual_approval ON public.ai_negotiations;

CREATE TRIGGER trg_ai_approval_creates_manual_approval
AFTER UPDATE OF human_approved ON public.ai_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_manual_approval_after_ai();

-- Comentários
COMMENT ON FUNCTION public.trigger_manual_approval_after_ai() IS 
'Cria aprovação manual automaticamente quando negociação IA é aprovada por humano, usando o valor negociado para verificar limites de aprovação';

COMMENT ON TRIGGER trg_ai_approval_creates_manual_approval ON public.ai_negotiations IS 
'Trigger que inicia fluxo de aprovação manual após aprovação humana da negociação IA';