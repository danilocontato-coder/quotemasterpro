-- =====================================================
-- Vincular profile danilo@dcport.com.br ao fornecedor DCPORT
-- =====================================================
-- Corrige o problema de RLS onde o usuário não conseguia
-- ver cotações porque seu profile.supplier_id estava NULL
-- =====================================================

UPDATE profiles
SET supplier_id = 'e0cf99f7-3508-46d1-8663-19a27ec819dd'
WHERE id = '2fa1b83d-e479-4ef1-b5fc-efe0139a8651'
  AND email = 'danilo@dcport.com.br'
  AND role = 'supplier';

-- Verificar o resultado
DO $$
DECLARE
  updated_profile RECORD;
BEGIN
  SELECT email, role, supplier_id INTO updated_profile
  FROM profiles
  WHERE id = '2fa1b83d-e479-4ef1-b5fc-efe0139a8651';
  
  IF updated_profile.supplier_id = 'e0cf99f7-3508-46d1-8663-19a27ec819dd' THEN
    RAISE NOTICE 'Profile vinculado com sucesso: % (supplier_id: %)', 
      updated_profile.email, updated_profile.supplier_id;
  ELSE
    RAISE WARNING 'Falha ao vincular profile. Supplier_id atual: %', updated_profile.supplier_id;
  END IF;
END $$;