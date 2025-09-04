-- Limpar perfis duplicados de Administradores, mantendo apenas o mais recente
DELETE FROM permission_profiles 
WHERE name = 'Administradores' 
  AND client_id = '539adc27-d695-4a61-849b-1fac0d60addd' 
  AND id NOT IN (
    SELECT id 
    FROM permission_profiles 
    WHERE name = 'Administradores' 
      AND client_id = '539adc27-d695-4a61-849b-1fac0d60addd' 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Atualizar o permission_profile_id do grupo Administradores para o perfil correto
UPDATE user_groups 
SET permission_profile_id = (
  SELECT id 
  FROM permission_profiles 
  WHERE name = 'Administradores' 
    AND client_id = '539adc27-d695-4a61-849b-1fac0d60addd' 
  LIMIT 1
)
WHERE name = 'Administradores';

-- Verificar se o perfil de Gestores existe e está vinculado corretamente
UPDATE user_groups 
SET permission_profile_id = '402c0875-2663-4933-adbe-814d3fbdce53'
WHERE name = 'Gestores' 
  AND id = '3bacf88b-aab1-4dc1-ab90-e308e09cadf2';