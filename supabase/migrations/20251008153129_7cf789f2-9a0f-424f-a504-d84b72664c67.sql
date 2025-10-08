-- Patch crítico: normalizar colunas string do auth.users que não podem ser NULL
-- Motivo: evitar erro "sql: Scan error ... converting NULL to string is unsupported" no /token

-- Corrige apenas as colunas que existem no schema auth atual
UPDATE auth.users
SET 
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, '')
WHERE 
  email_change IS NULL
  OR phone_change IS NULL;