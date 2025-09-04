-- Garantir que cada cliente tenha isolamento completo de dados
-- Verificar se o campo UUID é usado como PK na tabela clients
DO $$ 
BEGIN
    -- Confirmar que a PK é do tipo UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'Tabela clients deve ter campo id do tipo UUID como chave primária';
    END IF;
END $$;

-- Garantir que o default seja gen_random_uuid() para IDs únicos
ALTER TABLE public.clients ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Criar função para inicializar dados específicos do cliente
CREATE OR REPLACE FUNCTION public.initialize_client_data(client_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar registro de usage para o cliente
  INSERT INTO public.client_usage (client_id, quotes_this_month, users_count, storage_used_gb)
  VALUES (client_uuid, 0, 0, 0)
  ON CONFLICT (client_id) DO NOTHING;
  
  -- Log da inicialização
  INSERT INTO public.audit_logs (
    action, 
    entity_type, 
    entity_id, 
    panel_type, 
    details
  ) VALUES (
    'CLIENT_INITIALIZED',
    'clients',
    client_uuid::text,
    'system',
    '{"message": "Cliente inicializado com dados próprios"}'::jsonb
  );
END;
$$;

-- Trigger para inicializar dados do cliente automaticamente
CREATE OR REPLACE FUNCTION public.trg_client_initialize_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Executar inicialização dos dados após INSERT
  PERFORM public.initialize_client_data(NEW.id);
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela clients
DROP TRIGGER IF EXISTS trigger_client_initialize_data ON public.clients;
CREATE TRIGGER trigger_client_initialize_data
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_client_initialize_data();

-- Garantir que username seja único globalmente para evitar conflitos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clients_username_unique'
    ) THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_username_unique UNIQUE (username);
    END IF;
EXCEPTION WHEN others THEN
    -- Se já existe constraint, continua
    NULL;
END $$;

-- Inicializar dados para clientes existentes que não têm
DO $$
DECLARE
    client_record RECORD;
BEGIN
    FOR client_record IN 
        SELECT c.id FROM public.clients c
        LEFT JOIN public.client_usage cu ON cu.client_id = c.id
        WHERE cu.client_id IS NULL
    LOOP
        PERFORM public.initialize_client_data(client_record.id);
    END LOOP;
END $$;