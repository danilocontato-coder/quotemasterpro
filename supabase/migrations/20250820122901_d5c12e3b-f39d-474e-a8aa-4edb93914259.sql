-- Suppliers RLS: allow client members to manage their own suppliers
-- INSERT policy for clients/managers/collaborators scoped by client_id
create policy if not exists suppliers_insert_client
on public.suppliers
for insert
with check (
  public.get_user_role() = 'admin'
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
);

-- UPDATE policy for clients/managers/collaborators scoped by client_id
create policy if not exists suppliers_update_client
on public.suppliers
for update
using (
  public.get_user_role() = 'admin'
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
)
with check (
  public.get_user_role() = 'admin'
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
);

-- DELETE policy for clients/managers/collaborators scoped by client_id
create policy if not exists suppliers_delete_client
on public.suppliers
for delete
using (
  public.get_user_role() = 'admin'
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
);
