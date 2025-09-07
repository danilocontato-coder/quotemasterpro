-- Ajustar tabelas de comunicação para isolamento por client_id

-- Adicionar client_id nas tabelas que faltam e ajustar RLS
ALTER TABLE public.announcements ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.support_tickets ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.conversations ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Tornar client_id obrigatório nas tabelas principais
ALTER TABLE public.announcements ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.support_tickets ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN client_id SET NOT NULL;

-- Dropar políticas existentes
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_client_select" ON public.announcements;
DROP POLICY IF EXISTS "support_tickets_admin_all" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_client_access" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_messages_admin_all" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_client_access" ON public.ticket_messages;
DROP POLICY IF EXISTS "conversations_admin_all" ON public.conversations;
DROP POLICY IF EXISTS "conversations_participant_access" ON public.conversations;
DROP POLICY IF EXISTS "conversation_participants_admin_all" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_access" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_messages_admin_all" ON public.conversation_messages;
DROP POLICY IF EXISTS "conversation_messages_participant_access" ON public.conversation_messages;

-- Criar políticas RLS isoladas por client_id

-- Announcements (Comunicados)
CREATE POLICY "announcements_admin_all" ON public.announcements
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "announcements_client_select" ON public.announcements
FOR SELECT TO authenticated
USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "announcements_client_insert" ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "announcements_client_update" ON public.announcements
FOR UPDATE TO authenticated
USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Support Tickets
CREATE POLICY "support_tickets_admin_all" ON public.support_tickets
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "support_tickets_client_access" ON public.support_tickets
FOR ALL TO authenticated
USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Ticket Messages
CREATE POLICY "ticket_messages_admin_all" ON public.ticket_messages
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "ticket_messages_client_access" ON public.ticket_messages
FOR ALL TO authenticated
USING (
  get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
    AND st.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
)
WITH CHECK (
  get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
    AND st.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
);

-- Conversations
CREATE POLICY "conversations_admin_all" ON public.conversations
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "conversations_client_access" ON public.conversations
FOR ALL TO authenticated
USING (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Conversation Participants
CREATE POLICY "conversation_participants_admin_all" ON public.conversation_participants
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "conversation_participants_access" ON public.conversation_participants
FOR ALL TO authenticated
USING (
  get_user_role() = 'admin' OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_participants.conversation_id 
    AND c.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
)
WITH CHECK (
  get_user_role() = 'admin' OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_participants.conversation_id 
    AND c.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
);

-- Conversation Messages
CREATE POLICY "conversation_messages_admin_all" ON public.conversation_messages
FOR ALL TO authenticated
USING (get_user_role() = 'admin');

CREATE POLICY "conversation_messages_participant_access" ON public.conversation_messages
FOR ALL TO authenticated
USING (
  get_user_role() = 'admin' OR 
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    JOIN public.conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id = conversation_messages.conversation_id 
    AND cp.user_id = auth.uid()
    AND c.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
)
WITH CHECK (
  get_user_role() = 'admin' OR 
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    JOIN public.conversations c ON c.id = cp.conversation_id
    WHERE cp.conversation_id = conversation_messages.conversation_id 
    AND cp.user_id = auth.uid()
    AND c.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_announcements_client_id ON public.announcements(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);