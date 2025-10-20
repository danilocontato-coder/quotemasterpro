-- Migração: Normalizar especialidades de fornecedores (v3 - apenas specialties)
-- Esta migração mapeia especialidades antigas/inconsistentes para STANDARD_SPECIALTIES
-- Atualiza apenas a coluna specialties para evitar triggers de outras colunas

-- 1. Criar função auxiliar para normalizar array de especialidades
CREATE OR REPLACE FUNCTION normalize_specialties(specs text[])
RETURNS text[] AS $$
DECLARE
  result text[];
  spec text;
  normalized text;
BEGIN
  result := ARRAY[]::text[];
  
  FOREACH spec IN ARRAY specs
  LOOP
    -- Normalizar cada especialidade
    normalized := CASE spec
      WHEN 'equipamentos' THEN 'Ferramentas'
      WHEN 'ferramentas' THEN 'Ferramentas'
      WHEN 'materiais_construcao' THEN 'Materiais de Construção'
      WHEN 'Limpeza' THEN 'Produtos de Limpeza'
      WHEN 'Manutenção' THEN 'Serviços de Manutenção'
      WHEN 'Hidráulica' THEN 'Hidráulica e Saneamento'
      WHEN 'Segurança' THEN 'Segurança Patrimonial'
      WHEN 'TI e Telecom' THEN 'Tecnologia e Informática'
      WHEN 'Construção Civil' THEN 'Materiais de Construção'
      WHEN 'peças e serviços' THEN 'Serviços de Manutenção'
      ELSE spec
    END;
    
    -- Adicionar ao resultado se não for duplicata
    IF NOT (normalized = ANY(result)) THEN
      result := array_append(result, normalized);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Atualizar especialidades usando a função
UPDATE public.suppliers
SET specialties = normalize_specialties(specialties)
WHERE specialties IS NOT NULL
  AND (
    'equipamentos' = ANY(specialties) OR
    'ferramentas' = ANY(specialties) OR
    'materiais_construcao' = ANY(specialties) OR
    'Limpeza' = ANY(specialties) OR
    'Manutenção' = ANY(specialties) OR
    'Hidráulica' = ANY(specialties) OR
    'Segurança' = ANY(specialties) OR
    'TI e Telecom' = ANY(specialties) OR
    'Construção Civil' = ANY(specialties) OR
    'peças e serviços' = ANY(specialties)
  );

-- 3. Log de auditoria
INSERT INTO public.audit_logs (action, entity_type, entity_id, details, user_id)
SELECT 
  'SPECIALTY_NORMALIZATION_BULK',
  'suppliers',
  'system',
  jsonb_build_object(
    'reason', 'Platform standardization - unified with STANDARD_SPECIALTIES',
    'affected_suppliers', COUNT(*),
    'timestamp', now()
  ),
  NULL
FROM public.suppliers
WHERE specialties IS NOT NULL;

-- 4. Limpar função auxiliar (opcional - manter para uso futuro)
-- DROP FUNCTION normalize_specialties(text[]);