-- 1. Remover todas as políticas RLS que dependem de client_id
DROP POLICY IF EXISTS "suppliers_insert_client" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_client" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_client" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_regional_and_client_visibility" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin" ON public.suppliers;

-- 2. Criar backup da tabela suppliers antes de modificar
CREATE TABLE IF NOT EXISTS public.suppliers_backup AS SELECT * FROM public.suppliers;

-- 3. Remover client_id da tabela suppliers
ALTER TABLE public.suppliers DROP COLUMN IF EXISTS client_id CASCADE;

-- 4. Garantir que CNPJ seja único globalmente
DROP INDEX IF EXISTS uniq_suppliers_cnpj_client;
DROP INDEX IF EXISTS uniq_suppliers_cnpj_certified;
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_cnpj_global_unique 
ON public.suppliers ((regexp_replace(cnpj, '[^0-9]', '', 'g')));

-- 5. Adicionar campos de certificação e status
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS certification_status text DEFAULT 'pending' CHECK (certification_status IN ('pending', 'certified', 'suspended')),
ADD COLUMN IF NOT EXISTS certification_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS invited_by_clients uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_invitation_sent timestamp with time zone;

-- 6. Criar tabela de associação cliente-fornecedor
CREATE TABLE IF NOT EXISTS public.client_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  associated_at timestamp with time zone DEFAULT now(),
  invited_at timestamp with time zone,
  invitation_accepted_at timestamp with time zone,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_invitation')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(client_id, supplier_id)
);

-- 7. Habilitar RLS na nova tabela
ALTER TABLE public.client_suppliers ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para client_suppliers
CREATE POLICY "client_suppliers_admin_access" 
ON public.client_suppliers FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "client_suppliers_client_access" 
ON public.client_suppliers FOR ALL 
USING (client_id = get_current_user_client_id())
WITH CHECK (client_id = get_current_user_client_id());

-- 9. Novas políticas RLS para suppliers (sem client_id)
CREATE POLICY "suppliers_admin_full_access" 
ON public.suppliers FOR ALL 
USING (get_user_role() = 'admin');

CREATE POLICY "suppliers_own_access" 
ON public.suppliers FOR ALL 
USING (id = get_current_user_supplier_id())
WITH CHECK (id = get_current_user_supplier_id());

CREATE POLICY "suppliers_associated_clients_select" 
ON public.suppliers FOR SELECT 
USING (
  get_user_role() = 'admin' 
  OR id = get_current_user_supplier_id()
  OR EXISTS (
    SELECT 1 FROM public.client_suppliers cs 
    WHERE cs.supplier_id = suppliers.id 
    AND cs.client_id = get_current_user_client_id()
    AND cs.status = 'active'
  )
);

-- 10. Migrar dados existentes do backup
INSERT INTO public.client_suppliers (client_id, supplier_id, status, associated_at)
SELECT 
  sb.client_id, 
  sb.id, 
  'active',
  COALESCE(sb.created_at, now())
FROM public.suppliers_backup sb
WHERE sb.client_id IS NOT NULL
ON CONFLICT (client_id, supplier_id) DO NOTHING;