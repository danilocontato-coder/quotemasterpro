-- 1. Ativar RLS na tabela backup
ALTER TABLE public.suppliers_backup ENABLE ROW LEVEL SECURITY;

-- 2. Política RLS para a tabela backup (apenas admins)
CREATE POLICY "suppliers_backup_admin_only" 
ON public.suppliers_backup FOR ALL 
USING (get_user_role() = 'admin');

-- 3. Dropar função existente para recriar com nova assinatura
DROP FUNCTION IF EXISTS public.search_supplier_by_cnpj(text);

-- 4. Função para buscar ou criar fornecedor por CNPJ
CREATE OR REPLACE FUNCTION public.find_or_create_supplier_by_cnpj(
  p_cnpj text,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  supplier_id uuid,
  is_new boolean,
  certification_status text,
  existing_name text
) SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_cnpj text := regexp_replace(p_cnpj, '[^0-9]', '', 'g');
  existing_supplier RECORD;
  new_supplier_id uuid;
BEGIN
  -- Buscar fornecedor existente
  SELECT s.* INTO existing_supplier
  FROM public.suppliers s
  WHERE regexp_replace(s.cnpj, '[^0-9]', '', 'g') = normalized_cnpj;
  
  IF FOUND THEN
    -- Fornecedor existe, retornar dados existentes
    RETURN QUERY SELECT 
      existing_supplier.id,
      false,
      existing_supplier.certification_status,
      existing_supplier.name;
  ELSE
    -- Fornecedor não existe, criar novo
    INSERT INTO public.suppliers (
      cnpj, name, email, phone, 
      certification_status, status, is_certified
    ) VALUES (
      p_cnpj, p_name, p_email, p_phone,
      'pending', 'active', false
    ) RETURNING id INTO new_supplier_id;
    
    RETURN QUERY SELECT 
      new_supplier_id,
      true,
      'pending'::text,
      p_name;
  END IF;
END;
$$;

-- 5. Função para associar fornecedor ao cliente
CREATE OR REPLACE FUNCTION public.associate_supplier_to_client(
  p_supplier_id uuid,
  p_client_id uuid DEFAULT NULL
)
RETURNS uuid SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  target_client_id uuid := COALESCE(p_client_id, get_current_user_client_id());
  association_id uuid;
BEGIN
  -- Verificar se já existe associação
  SELECT id INTO association_id
  FROM public.client_suppliers
  WHERE supplier_id = p_supplier_id AND client_id = target_client_id;
  
  IF FOUND THEN
    -- Reativar se estava inativa
    UPDATE public.client_suppliers 
    SET status = 'active', updated_at = now()
    WHERE id = association_id;
  ELSE
    -- Criar nova associação
    INSERT INTO public.client_suppliers (client_id, supplier_id, status)
    VALUES (target_client_id, p_supplier_id, 'active')
    RETURNING id INTO association_id;
  END IF;
  
  RETURN association_id;
END;
$$;

-- 6. Função para convidar fornecedor não certificado
CREATE OR REPLACE FUNCTION public.invite_supplier_certification(
  p_supplier_id uuid,
  p_message text DEFAULT NULL
)
RETURNS json SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  current_client_id uuid := get_current_user_client_id();
  supplier_record RECORD;
BEGIN
  -- Buscar dados do fornecedor
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = p_supplier_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Fornecedor não encontrado');
  END IF;
  
  -- Verificar se já está certificado
  IF supplier_record.certification_status = 'certified' THEN
    RETURN json_build_object('success', false, 'error', 'Fornecedor já está certificado');
  END IF;
  
  -- Atualizar lista de clientes que convidaram
  UPDATE public.suppliers
  SET 
    invited_by_clients = COALESCE(invited_by_clients, '{}') || ARRAY[current_client_id],
    last_invitation_sent = now(),
    updated_at = now()
  WHERE id = p_supplier_id;
  
  -- Criar/atualizar associação com status de convite pendente
  INSERT INTO public.client_suppliers (client_id, supplier_id, status, invited_at)
  VALUES (current_client_id, p_supplier_id, 'pending_invitation', now())
  ON CONFLICT (client_id, supplier_id) 
  DO UPDATE SET 
    invited_at = now(),
    status = 'pending_invitation',
    updated_at = now();
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Convite enviado com sucesso',
    'supplier_name', supplier_record.name
  );
END;
$$;

-- 7. Nova função de busca por CNPJ
CREATE OR REPLACE FUNCTION public.search_supplier_by_cnpj(search_cnpj text)
RETURNS TABLE (
  id uuid,
  name text,
  cnpj text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address jsonb,
  specialties text[],
  certification_status text,
  is_associated boolean
) SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text := regexp_replace(search_cnpj, '[^0-9]', '', 'g');
  current_client_id uuid := get_current_user_client_id();
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, s.cnpj, s.email, s.phone, s.whatsapp, s.website, 
    s.address, s.specialties, s.certification_status,
    EXISTS (
      SELECT 1 FROM public.client_suppliers cs 
      WHERE cs.supplier_id = s.id 
      AND cs.client_id = current_client_id 
      AND cs.status = 'active'
    ) as is_associated
  FROM public.suppliers s
  WHERE regexp_replace(s.cnpj, '[^0-9]', '', 'g') = normalized
  ORDER BY s.certification_status DESC, s.created_at DESC;
END;
$$;

-- 8. Função para listar fornecedores associados ao cliente atual
CREATE OR REPLACE FUNCTION public.get_client_suppliers()
RETURNS TABLE (
  id uuid,
  name text,
  cnpj text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address jsonb,
  specialties text[],
  certification_status text,
  status text,
  rating numeric,
  completed_orders integer,
  association_status text,
  associated_at timestamp with time zone
) SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  current_client_id uuid := get_current_user_client_id();
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, s.cnpj, s.email, s.phone, s.whatsapp, s.website, 
    s.address, s.specialties, s.certification_status, s.status,
    s.rating, s.completed_orders,
    cs.status as association_status,
    cs.associated_at
  FROM public.suppliers s
  INNER JOIN public.client_suppliers cs ON cs.supplier_id = s.id
  WHERE cs.client_id = current_client_id
  ORDER BY 
    CASE WHEN s.certification_status = 'certified' THEN 0 ELSE 1 END,
    s.rating DESC NULLS LAST,
    s.name ASC;
END;
$$;

-- 9. Grants das novas funções
GRANT EXECUTE ON FUNCTION public.find_or_create_supplier_by_cnpj(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.associate_supplier_to_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_supplier_certification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_supplier_by_cnpj(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_suppliers() TO authenticated;