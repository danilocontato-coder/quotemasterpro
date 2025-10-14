-- Criar política RLS para permitir fornecedores verem suas cotações direcionadas
CREATE POLICY "quote_suppliers_supplier_view" 
ON public.quote_suppliers 
FOR SELECT 
USING (supplier_id = get_current_user_supplier_id());