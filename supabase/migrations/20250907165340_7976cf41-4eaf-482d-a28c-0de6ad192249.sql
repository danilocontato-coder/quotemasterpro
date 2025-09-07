-- Add supplier support to announcements table
ALTER TABLE public.announcements 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN supplier_name TEXT;

-- Add supplier support to support_tickets table  
ALTER TABLE public.support_tickets
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN supplier_name TEXT;

-- Update RLS policies for announcements to support suppliers
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_delete" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_update" ON public.announcements;

CREATE POLICY "announcements_admin_all" 
ON public.announcements 
FOR ALL 
TO authenticated
USING (get_user_role() = 'admin'::text);

CREATE POLICY "announcements_client_select" 
ON public.announcements 
FOR SELECT 
TO authenticated
USING (
  (client_id IN (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid())) OR
  (supplier_id = get_current_user_supplier_id())
);

CREATE POLICY "announcements_supplier_select" 
ON public.announcements 
FOR SELECT 
TO authenticated
USING (supplier_id = get_current_user_supplier_id());

-- Update RLS policies for support_tickets to support suppliers
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

-- Update ticket_messages policies for suppliers
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