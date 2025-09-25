-- Atualizar função para gerar código de 4 dígitos
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código de 4 dígitos
    new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;