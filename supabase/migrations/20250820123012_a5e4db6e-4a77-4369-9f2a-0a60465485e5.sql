-- Suppliers RLS: allow client members to CRUD their own suppliers
create policy suppliers_insert_client
on public.suppliers
for insert
with check (
  public.get_user_role() = 'admin' 
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
);

create policy suppliers_update_client
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

create policy suppliers_delete_client
on public.suppliers
for delete
using (
  public.get_user_role() = 'admin' 
  or (client_id in (
    select profiles.client_id from public.profiles where profiles.id = auth.uid()
  ))
);