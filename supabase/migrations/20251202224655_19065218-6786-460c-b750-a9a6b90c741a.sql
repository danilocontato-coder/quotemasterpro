-- Corrigir RLS Policy de SELECT para incluir fornecedores
DROP POLICY IF EXISTS notifications_secure_select ON notifications;

CREATE POLICY notifications_secure_select ON notifications
FOR SELECT USING (
  -- Admin vê tudo
  (get_user_role() = 'admin') 
  OR 
  -- Notificação direta do usuário
  (user_id = auth.uid())
  OR
  -- Broadcast para cliente (se usuário pertence ao cliente)
  (client_id IS NOT NULL AND client_id = get_current_user_client_id())
  OR
  -- Broadcast para fornecedor (se usuário pertence ao fornecedor)
  (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id())
);

-- Corrigir RLS Policy de UPDATE para incluir fornecedores
DROP POLICY IF EXISTS notifications_secure_update ON notifications;

CREATE POLICY notifications_secure_update ON notifications
FOR UPDATE USING (
  (get_user_role() = 'admin')
  OR
  (user_id = auth.uid())
  OR
  (client_id IS NOT NULL AND client_id = get_current_user_client_id())
  OR
  (supplier_id IS NOT NULL AND supplier_id = get_current_user_supplier_id())
);

-- Adicionar comentário explicativo
COMMENT ON POLICY notifications_secure_select ON notifications IS 'Permite SELECT para admins, usuários diretos, clientes e fornecedores vinculados';
COMMENT ON POLICY notifications_secure_update ON notifications IS 'Permite UPDATE para admins, usuários diretos, clientes e fornecedores vinculados';