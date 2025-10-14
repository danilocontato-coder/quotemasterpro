-- 1) Garantir módulos no plano 'basic'
UPDATE public.subscription_plans
SET enabled_modules = COALESCE(
  CASE
    WHEN enabled_modules IS NULL OR enabled_modules::text = '[]' THEN
      '["quotes","suppliers","users","products","payments"]'::jsonb
    ELSE
      -- garante presença dos módulos necessários (faz merge mantendo existentes)
      (SELECT to_jsonb(
         ARRAY(
           SELECT DISTINCT m
           FROM jsonb_array_elements_text(enabled_modules) AS m
           UNION
           SELECT unnest(ARRAY['quotes','suppliers','users','products','payments'])
         )
       )::jsonb)
  END,
  '["quotes","suppliers","users","products","payments"]'::jsonb
)
WHERE id = 'basic';

-- 2) System setting: default_supplier_plan_id = 'basic'
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('default_supplier_plan_id', jsonb_build_object('plan_id','basic'), 'Plano padrão para novos fornecedores')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = now();

-- 3) Função que retorna o plano padrão
CREATE OR REPLACE FUNCTION public.get_default_supplier_plan_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT setting_value->>'plan_id'
     FROM public.system_settings
     WHERE setting_key = 'default_supplier_plan_id'
     LIMIT 1),
    'basic'
  );
$$;

-- 4) Trigger para setar plano padrão na criação de fornecedor
CREATE OR REPLACE FUNCTION public.trg_suppliers_set_default_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan_id IS NULL OR btrim(NEW.subscription_plan_id) = '' THEN
    NEW.subscription_plan_id := public.get_default_supplier_plan_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_set_default_plan ON public.suppliers;
CREATE TRIGGER suppliers_set_default_plan
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.trg_suppliers_set_default_plan();

-- 5) Backfill imediato para fornecedores sem plano
UPDATE public.suppliers
SET subscription_plan_id = public.get_default_supplier_plan_id()
WHERE (subscription_plan_id IS NULL OR btrim(subscription_plan_id) = '');