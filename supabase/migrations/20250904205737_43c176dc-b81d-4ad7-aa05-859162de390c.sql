-- Criar tabela para relacionamento entre cotações e fornecedores selecionados
CREATE TABLE IF NOT EXISTS public.quote_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quote_id, supplier_id)
);

-- Habilitar RLS
ALTER TABLE public.quote_suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para quote_suppliers
CREATE POLICY "quote_suppliers_select" ON public.quote_suppliers
  FOR SELECT USING (
    get_user_role() = 'admin'::text OR 
    supplier_id = get_current_user_supplier_id() OR
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_suppliers.quote_id 
      AND q.client_id IN (
        SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "quote_suppliers_insert" ON public.quote_suppliers
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin'::text OR
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_suppliers.quote_id 
      AND q.client_id IN (
        SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "quote_suppliers_delete" ON public.quote_suppliers
  FOR DELETE USING (
    get_user_role() = 'admin'::text OR
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_suppliers.quote_id 
      AND q.client_id IN (
        SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );