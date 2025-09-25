-- Criar tabelas para sistema de chat interno entre clientes e fornecedores
-- Tabela para conversas de cotações
CREATE TABLE IF NOT EXISTS quote_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id text NOT NULL,
  client_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  
  -- Foreign key constraints implícitas (via RLS)
  UNIQUE(quote_id, supplier_id)
);

-- Tabela para mensagens das conversas
CREATE TABLE IF NOT EXISTS quote_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES quote_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'supplier')),
  content text NOT NULL,
  attachments text[] DEFAULT '{}',
  read_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_quote_messages_conversation ON quote_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_quote_messages_created_at ON quote_messages(created_at DESC);

-- Enable RLS
ALTER TABLE quote_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies para quote_conversations
CREATE POLICY "quote_conversations_admin_all" 
ON quote_conversations FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "quote_conversations_client_access" 
ON quote_conversations FOR ALL 
USING (
  client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT profiles.client_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "quote_conversations_supplier_access" 
ON quote_conversations FOR ALL 
USING (supplier_id = get_current_user_supplier_id())
WITH CHECK (supplier_id = get_current_user_supplier_id());

-- RLS policies para quote_messages
CREATE POLICY "quote_messages_admin_all" 
ON quote_messages FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "quote_messages_conversation_access" 
ON quote_messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM quote_conversations qc 
    WHERE qc.id = quote_messages.conversation_id 
    AND (
      qc.client_id IN (
        SELECT profiles.client_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
      OR qc.supplier_id = get_current_user_supplier_id()
      OR get_user_role() = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quote_conversations qc 
    WHERE qc.id = quote_messages.conversation_id 
    AND (
      qc.client_id IN (
        SELECT profiles.client_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
      OR qc.supplier_id = get_current_user_supplier_id()
      OR get_user_role() = 'admin'
    )
  )
);

-- Trigger para atualizar last_message_at na conversa
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quote_conversations 
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON quote_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Trigger para updated_at nas conversas
CREATE TRIGGER update_quote_conversations_updated_at
  BEFORE UPDATE ON quote_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para as tabelas
ALTER TABLE quote_conversations REPLICA IDENTITY FULL;
ALTER TABLE quote_messages REPLICA IDENTITY FULL;