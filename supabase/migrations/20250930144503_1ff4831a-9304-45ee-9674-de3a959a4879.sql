-- Tabela para rastrear status de cada fornecedor por cotação
CREATE TABLE IF NOT EXISTS public.quote_supplier_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  client_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'declined', 'proposal_sent', 'reminded_once', 'reminded_twice')),
  declined_reason TEXT,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  proposal_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(quote_id, supplier_id)
);

-- Índices para performance
CREATE INDEX idx_quote_supplier_status_quote ON public.quote_supplier_status(quote_id);
CREATE INDEX idx_quote_supplier_status_supplier ON public.quote_supplier_status(supplier_id);
CREATE INDEX idx_quote_supplier_status_status ON public.quote_supplier_status(status);
CREATE INDEX idx_quote_supplier_status_client ON public.quote_supplier_status(client_id);

-- Habilitar RLS
ALTER TABLE public.quote_supplier_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "quote_supplier_status_admin_all"
ON public.quote_supplier_status FOR ALL
USING (get_user_role() = 'admin');

CREATE POLICY "quote_supplier_status_client_view"
ON public.quote_supplier_status FOR SELECT
USING (
  (get_user_role() = 'admin') OR
  (client_id = get_current_user_client_id())
);

CREATE POLICY "quote_supplier_status_supplier_view"
ON public.quote_supplier_status FOR SELECT
USING (
  (get_user_role() = 'admin') OR
  (supplier_id = get_current_user_supplier_id())
);

CREATE POLICY "quote_supplier_status_supplier_update"
ON public.quote_supplier_status FOR UPDATE
USING (supplier_id = get_current_user_supplier_id())
WITH CHECK (supplier_id = get_current_user_supplier_id());

-- Trigger para auto-definir client_id
CREATE OR REPLACE FUNCTION public.trg_quote_supplier_status_set_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := (
      SELECT q.client_id 
      FROM public.quotes q 
      WHERE q.id = NEW.quote_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_supplier_status_set_client_id
  BEFORE INSERT ON public.quote_supplier_status
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_quote_supplier_status_set_client_id();

-- Trigger para updated_at
CREATE TRIGGER update_quote_supplier_status_updated_at
  BEFORE UPDATE ON public.quote_supplier_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar status automaticamente quando proposta é recebida
CREATE OR REPLACE FUNCTION public.trg_update_supplier_status_on_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_supplier_status
  SET 
    status = 'proposal_sent',
    proposal_received_at = now(),
    updated_at = now()
  WHERE quote_id = NEW.quote_id 
    AND supplier_id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_supplier_status_on_proposal
  AFTER INSERT ON public.quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_supplier_status_on_proposal();