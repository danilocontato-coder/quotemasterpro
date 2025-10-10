-- Migration 4: Criar triggers de notificação para visitas técnicas

-- Função para notificar quando visita é agendada
CREATE OR REPLACE FUNCTION public.notify_visit_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar cliente
  INSERT INTO public.notifications (user_id, title, message, type, priority, metadata)
  SELECT 
    p.id,
    'Visita Técnica Agendada',
    'O fornecedor ' || s.name || ' agendou visita técnica para ' || to_char(NEW.scheduled_date, 'DD/MM/YYYY às HH24:MI'),
    'visit',
    'normal',
    jsonb_build_object('visit_id', NEW.id, 'quote_id', NEW.quote_id, 'supplier_id', NEW.supplier_id)
  FROM public.profiles p
  CROSS JOIN public.suppliers s
  WHERE s.id = NEW.supplier_id
    AND p.client_id = NEW.client_id
    AND p.active = true;
  
  RETURN NEW;
END;
$$;

-- Trigger para visitas agendadas
DROP TRIGGER IF EXISTS trg_notify_visit_scheduled ON public.quote_visits;
CREATE TRIGGER trg_notify_visit_scheduled
AFTER INSERT ON public.quote_visits
FOR EACH ROW
EXECUTE FUNCTION public.notify_visit_scheduled();

-- Função para notificar quando visita é confirmada
CREATE OR REPLACE FUNCTION public.notify_visit_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Notificar cliente
    INSERT INTO public.notifications (user_id, title, message, type, priority, metadata)
    SELECT 
      p.id,
      'Visita Técnica Realizada',
      'O fornecedor confirmou a realização da visita técnica. Aguarde o envio da proposta.',
      'success',
      'high',
      jsonb_build_object('visit_id', NEW.id, 'quote_id', NEW.quote_id, 'supplier_id', NEW.supplier_id)
    FROM public.profiles p
    WHERE p.client_id = NEW.client_id
      AND p.active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para visitas confirmadas
DROP TRIGGER IF EXISTS trg_notify_visit_confirmed ON public.quote_visits;
CREATE TRIGGER trg_notify_visit_confirmed
AFTER UPDATE ON public.quote_visits
FOR EACH ROW
EXECUTE FUNCTION public.notify_visit_confirmed();

-- Função para notificar quando visita está atrasada
CREATE OR REPLACE FUNCTION public.notify_visit_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'overdue' AND (OLD.status IS NULL OR OLD.status != 'overdue') THEN
    -- Notificar cliente
    INSERT INTO public.notifications (user_id, title, message, type, priority, metadata)
    SELECT 
      p.id,
      'Visita Técnica Atrasada',
      'A visita técnica agendada pelo fornecedor ' || s.name || ' está atrasada.',
      'warning',
      'high',
      jsonb_build_object('visit_id', NEW.id, 'quote_id', NEW.quote_id, 'supplier_id', NEW.supplier_id)
    FROM public.profiles p
    CROSS JOIN public.suppliers s
    WHERE s.id = NEW.supplier_id
      AND p.client_id = NEW.client_id
      AND p.active = true;
    
    -- Notificar fornecedor
    INSERT INTO public.notifications (user_id, title, message, type, priority, metadata)
    SELECT 
      p.id,
      'Atenção: Visita Técnica Atrasada',
      'A visita técnica para a cotação ' || NEW.quote_id || ' está atrasada. Confirme a realização ou reagende.',
      'error',
      'high',
      jsonb_build_object('visit_id', NEW.id, 'quote_id', NEW.quote_id)
    FROM public.profiles p
    WHERE p.supplier_id = NEW.supplier_id
      AND p.active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para visitas atrasadas
DROP TRIGGER IF EXISTS trg_notify_visit_overdue ON public.quote_visits;
CREATE TRIGGER trg_notify_visit_overdue
AFTER UPDATE ON public.quote_visits
FOR EACH ROW
EXECUTE FUNCTION public.notify_visit_overdue();

-- Comentários
COMMENT ON FUNCTION public.notify_visit_scheduled() IS 'Notifica cliente quando fornecedor agenda visita técnica';
COMMENT ON FUNCTION public.notify_visit_confirmed() IS 'Notifica cliente quando fornecedor confirma realização da visita';
COMMENT ON FUNCTION public.notify_visit_overdue() IS 'Notifica cliente e fornecedor quando visita está atrasada';