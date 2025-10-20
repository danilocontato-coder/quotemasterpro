-- Correção: Adicionar search_path à função normalize_specialties
-- Resolve warning de segurança "Function Search Path Mutable"

CREATE OR REPLACE FUNCTION normalize_specialties(specs text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text[];
  spec text;
  normalized text;
BEGIN
  result := ARRAY[]::text[];
  
  FOREACH spec IN ARRAY specs
  LOOP
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
    
    IF NOT (normalized = ANY(result)) THEN
      result := array_append(result, normalized);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;