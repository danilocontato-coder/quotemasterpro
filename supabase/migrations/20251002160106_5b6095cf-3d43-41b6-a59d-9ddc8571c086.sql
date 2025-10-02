-- Atualizar todos os planos para fornecedores ilimitados
UPDATE subscription_plans 
SET 
  max_suppliers = -1,
  max_suppliers_per_quote = -1,
  max_storage_gb = -1,
  updated_at = now();

-- Adicionar comentários nas colunas
COMMENT ON COLUMN subscription_plans.max_suppliers IS 'Limite de fornecedores cadastrados. -1 = ilimitado';
COMMENT ON COLUMN subscription_plans.max_suppliers_per_quote IS 'Limite de fornecedores por cotação. -1 = ilimitado';
COMMENT ON COLUMN subscription_plans.max_storage_gb IS 'Armazenamento em GB. -1 = ilimitado (não utilizado no momento)';