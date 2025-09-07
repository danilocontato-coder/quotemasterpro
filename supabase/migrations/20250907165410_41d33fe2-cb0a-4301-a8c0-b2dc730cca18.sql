-- Add supplier support to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Add supplier support to support_tickets table  
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Remove duplicate policies first
DROP POLICY IF EXISTS "announcements_client_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_supplier_select" ON public.announcements;
DROP POLICY IF EXISTS "support_tickets_supplier_access" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_messages_supplier_access" ON public.ticket_messages;

-- Create new policies for announcements to support suppliers
CREATE POLICY "announcements_client_select" 
ON public.announcements 
FOR SELECT 
TO authenticated
USING (
  client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "announcements_supplier_select" 
ON public.announcements 
FOR SELECT 
TO authenticated
USING (supplier_id = get_current_user_supplier_id());

-- Create policies for support_tickets to support suppliers
CREATE POLICY "support_tickets_supplier_access" 
ON public.support_tickets 
FOR ALL 
TO authenticated
USING (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id = get_current_user_supplier_id())
)
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (supplier_id = get_current_user_supplier_id() AND created_by = auth.uid())
);

-- Create policies for ticket_messages for suppliers
CREATE POLICY "ticket_messages_supplier_access" 
ON public.ticket_messages 
FOR ALL 
TO authenticated
USING (
  (get_user_role() = 'admin'::text) OR 
  (EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
    AND (
      st.client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
      st.supplier_id = get_current_user_supplier_id()
    )
  ))
)
WITH CHECK (
  (get_user_role() = 'admin'::text) OR 
  (EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_messages.ticket_id 
    AND (
      st.client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
      st.supplier_id = get_current_user_supplier_id()
    )
  ))
);