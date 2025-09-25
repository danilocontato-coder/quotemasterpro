-- Verificar e ajustar tabela supplier_ratings existente
DO $$
BEGIN
  -- Adicionar coluna user_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_ratings' AND column_name = 'user_id') THEN
    ALTER TABLE public.supplier_ratings ADD COLUMN user_id UUID;
  END IF;
  
  -- Adicionar coluna client_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_ratings' AND column_name = 'client_id') THEN
    ALTER TABLE public.supplier_ratings ADD COLUMN client_id UUID;
  END IF;

  -- Adicionar coluna payment_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_ratings' AND column_name = 'payment_id') THEN
    ALTER TABLE public.supplier_ratings ADD COLUMN payment_id TEXT;
  END IF;
END
$$;

-- Habilitar RLS se ainda não estiver
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existem
DROP POLICY IF EXISTS "supplier_ratings_insert" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_select" ON public.supplier_ratings;
DROP POLICY IF EXISTS "supplier_ratings_update" ON public.supplier_ratings;

-- Criar políticas RLS
CREATE POLICY "supplier_ratings_insert" ON public.supplier_ratings
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND 
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "supplier_ratings_select" ON public.supplier_ratings
FOR SELECT USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR
  supplier_id = get_current_user_supplier_id()
);

CREATE POLICY "supplier_ratings_update" ON public.supplier_ratings
FOR UPDATE USING (
  user_id = auth.uid() AND 
  client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

-- Função para criar prompt de avaliação após pagamento
CREATE OR REPLACE FUNCTION public.create_rating_prompt_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar prompt quando pagamento for completado
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Buscar informações da cotação e fornecedor
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    )
    SELECT 
      p.id,
      'Avalie seu Fornecedor',
      'Avalie a qualidade do serviço prestado pelo fornecedor na cotação #' || NEW.quote_id,
      'rating_prompt',
      'normal',
      '/quotes',
      jsonb_build_object(
        'type', 'rating_prompt',
        'payment_id', NEW.id,
        'quote_id', NEW.quote_id,
        'supplier_id', NEW.supplier_id,
        'supplier_name', COALESCE(s.name, 'Fornecedor')
      )
    FROM public.profiles p
    LEFT JOIN public.suppliers s ON s.id = NEW.supplier_id
    WHERE p.client_id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar prompt após pagamento
DROP TRIGGER IF EXISTS trigger_rating_prompt_after_payment ON public.payments;
CREATE TRIGGER trigger_rating_prompt_after_payment
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.create_rating_prompt_after_payment();

-- Função para atualizar rating médio do fornecedor
CREATE OR REPLACE FUNCTION public.update_supplier_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  new_avg_rating NUMERIC;
BEGIN
  -- Calcular nova média de avaliação
  SELECT ROUND(AVG(rating), 2) INTO new_avg_rating
  FROM public.supplier_ratings
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  -- Atualizar tabela de fornecedores
  UPDATE public.suppliers
  SET rating = COALESCE(new_avg_rating, 0),
      updated_at = now()
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para atualizar rating médio
DROP TRIGGER IF EXISTS trigger_update_supplier_rating_after_insert ON public.supplier_ratings;
DROP TRIGGER IF EXISTS trigger_update_supplier_rating_after_update ON public.supplier_ratings;
DROP TRIGGER IF EXISTS trigger_update_supplier_rating_after_delete ON public.supplier_ratings;

CREATE TRIGGER trigger_update_supplier_rating_after_insert
AFTER INSERT ON public.supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_average_rating();

CREATE TRIGGER trigger_update_supplier_rating_after_update
AFTER UPDATE ON public.supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_average_rating();

CREATE TRIGGER trigger_update_supplier_rating_after_delete
AFTER DELETE ON public.supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_average_rating();

-- Função para notificar fornecedor sobre nova avaliação
CREATE OR REPLACE FUNCTION public.notify_supplier_rating()
RETURNS TRIGGER AS $$
DECLARE
  supplier_users_count INTEGER;
BEGIN
  -- Contar usuários do fornecedor
  SELECT COUNT(*) INTO supplier_users_count
  FROM public.profiles
  WHERE supplier_id = NEW.supplier_id;
  
  -- Se fornecedor tem usuários no sistema, notificar
  IF supplier_users_count > 0 THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      priority,
      metadata
    )
    SELECT 
      p.id,
      'Nova Avaliação Recebida',
      'Você recebeu uma nova avaliação do cliente. Nota: ' || NEW.rating || '/5 ⭐',
      'rating_received',
      'normal',
      jsonb_build_object(
        'rating_id', NEW.id,
        'rating', NEW.rating,
        'quote_id', NEW.quote_id,
        'client_name', COALESCE(c.name, 'Cliente')
      )
    FROM public.profiles p
    LEFT JOIN public.clients c ON c.id = NEW.client_id
    WHERE p.supplier_id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificar fornecedor
DROP TRIGGER IF EXISTS trigger_notify_supplier_rating ON public.supplier_ratings;
CREATE TRIGGER trigger_notify_supplier_rating
AFTER INSERT ON public.supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION public.notify_supplier_rating();