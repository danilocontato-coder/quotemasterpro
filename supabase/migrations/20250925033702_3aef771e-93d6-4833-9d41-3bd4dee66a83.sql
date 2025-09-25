-- Criar tabela para códigos de confirmação de entrega
CREATE TABLE public.delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  confirmation_code TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Fornecedores podem ver códigos de suas entregas"
ON public.delivery_confirmations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
    AND d.supplier_id = get_current_user_supplier_id()
  )
);

CREATE POLICY "Clientes podem ver códigos de suas entregas"
ON public.delivery_confirmations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
    AND d.client_id IN (
      SELECT client_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Sistema pode inserir códigos"
ON public.delivery_confirmations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Clientes podem confirmar códigos"
ON public.delivery_confirmations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_confirmations.delivery_id
    AND d.client_id IN (
      SELECT client_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Admins podem tudo"
ON public.delivery_confirmations
FOR ALL
USING (get_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_delivery_confirmations_updated_at
BEFORE UPDATE ON public.delivery_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar código único de 6 dígitos
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código de 6 dígitos
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Verificar se já existe
    SELECT EXISTS(
      SELECT 1 FROM public.delivery_confirmations 
      WHERE confirmation_code = new_code AND is_used = false
    ) INTO code_exists;
    
    -- Se não existe, retornar
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar código automaticamente quando entrega é agendada
CREATE OR REPLACE FUNCTION public.create_delivery_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar código quando status muda para 'scheduled'
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
    INSERT INTO public.delivery_confirmations (
      delivery_id,
      confirmation_code
    ) VALUES (
      NEW.id,
      public.generate_delivery_code()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_delivery_confirmation
AFTER INSERT OR UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.create_delivery_confirmation_code();