
-- Sincronizar users_count em client_usage com contagem real
UPDATE client_usage 
SET users_count = (
  SELECT COUNT(*) 
  FROM users 
  WHERE users.client_id = client_usage.client_id 
    AND users.status = 'active'
),
updated_at = NOW();

-- Criar trigger para manter users_count sincronizado automaticamente
CREATE OR REPLACE FUNCTION sync_client_usage_users_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar contagem quando usuário é inserido, atualizado ou deletado
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO client_usage (client_id, users_count, updated_at)
    VALUES (NEW.client_id, 1, NOW())
    ON CONFLICT (client_id)
    DO UPDATE SET
      users_count = (
        SELECT COUNT(*)
        FROM users
        WHERE client_id = NEW.client_id AND status = 'active'
      ),
      updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE client_usage
    SET users_count = (
      SELECT COUNT(*)
      FROM users
      WHERE client_id = OLD.client_id AND status = 'active'
    ),
    updated_at = NOW()
    WHERE client_id = OLD.client_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Criar trigger na tabela users
DROP TRIGGER IF EXISTS trigger_sync_users_count ON users;
CREATE TRIGGER trigger_sync_users_count
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_client_usage_users_count();
