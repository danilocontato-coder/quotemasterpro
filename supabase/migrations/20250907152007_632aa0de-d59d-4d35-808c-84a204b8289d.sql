-- Create communication tables isolated by client_id

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info | warning | success | urgent
  priority text NOT NULL DEFAULT 'medium', -- low | medium | high
  target_audience text NOT NULL DEFAULT 'clients', -- clients | suppliers | all
  attachments text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_by_name text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Track announcement reads per user
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Tickets
-- Sequence and function for human-friendly ticket IDs
CREATE SEQUENCE IF NOT EXISTS public.ticket_id_seq;

CREATE OR REPLACE FUNCTION public.next_ticket_id(prefix text DEFAULT 'TKT')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.ticket_id_seq');
  RETURN prefix || lpad(n::text, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id text PRIMARY KEY DEFAULT public.next_ticket_id('TKT'),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  priority text NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
  category text,
  created_by uuid NOT NULL,
  created_by_name text,
  assigned_to uuid,
  assigned_to_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text,
  content text NOT NULL,
  attachments text[] NOT NULL DEFAULT '{}',
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Triggers to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies
-- Announcements
DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
DROP POLICY IF EXISTS announcements_client_select ON public.announcements;
DROP POLICY IF EXISTS announcements_client_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_client_update ON public.announcements;

CREATE POLICY announcements_admin_all ON public.announcements
FOR ALL
USING (public.get_user_role() = 'admin');

CREATE POLICY announcements_client_select ON public.announcements
FOR SELECT
USING (
  public.get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Only admins can create/update/delete announcements by default
CREATE POLICY announcements_admin_write ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY announcements_admin_update ON public.announcements
FOR UPDATE
USING (public.get_user_role() = 'admin');

CREATE POLICY announcements_admin_delete ON public.announcements
FOR DELETE
USING (public.get_user_role() = 'admin');

-- Announcement reads: users can insert/select their own
DROP POLICY IF EXISTS announcement_reads_insert ON public.announcement_reads;
DROP POLICY IF EXISTS announcement_reads_select ON public.announcement_reads;

CREATE POLICY announcement_reads_insert ON public.announcement_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY announcement_reads_select ON public.announcement_reads
FOR SELECT
USING (user_id = auth.uid());

-- Support tickets
DROP POLICY IF EXISTS support_tickets_admin_all ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_client_access ON public.support_tickets;

CREATE POLICY support_tickets_admin_all ON public.support_tickets
FOR ALL
USING (public.get_user_role() = 'admin');

CREATE POLICY support_tickets_client_select ON public.support_tickets
FOR SELECT
USING (
  public.get_user_role() = 'admin' OR 
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY support_tickets_client_insert ON public.support_tickets
FOR INSERT
WITH CHECK (
  client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY support_tickets_client_update ON public.support_tickets
FOR UPDATE
USING (
  public.get_user_role() = 'admin' OR 
  (client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
   AND (created_by = auth.uid() OR assigned_to = auth.uid()))
);

-- Ticket messages policies
DROP POLICY IF EXISTS ticket_messages_admin_all ON public.ticket_messages;
DROP POLICY IF EXISTS ticket_messages_client_access ON public.ticket_messages;

CREATE POLICY ticket_messages_admin_all ON public.ticket_messages
FOR ALL
USING (public.get_user_role() = 'admin');

CREATE POLICY ticket_messages_client_access ON public.ticket_messages
FOR ALL
USING (
  public.get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
      AND st.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
)
WITH CHECK (
  public.get_user_role() = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
      AND st.client_id IN (SELECT profiles.client_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_client_id ON public.announcements(client_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_user ON public.announcement_reads(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
