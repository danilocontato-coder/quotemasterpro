/*
  Supabase Safe Queries Toolkit
  - Evita recursão de RLS ao separar consultas de relações (ex: quote_items)
  - Fornece utilitários para detectar selects com embeds e buscar filhos em chamada separada

  Uso rápido:
    import { fetchParentsWithChildren, isEmbeddedSelect } from '@/lib/supabaseSafeQueries';

    // 1) Evite embeds: isEmbeddedSelect('*, quote_items (*)') -> true

    // 2) Busque pais e filhos separadamente
    const { parents, childrenByParentId } = await fetchParentsWithChildren({
      parentTable: 'quotes',
      childTable: 'quote_items',
      childFkColumn: 'quote_id',
      parentFilter: (q) => q
        .eq('supplier_scope', 'global')
        .in('status', ['sent','receiving'])
        .order('created_at', { ascending: false }),
    });

    // 3) Monte objetos
    const quotes = parents.map((p: any) => ({
      ...p,
      items: childrenByParentId[p.id] || []
    }));
*/

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const isEmbeddedSelect = (select: string) => /\([^)]*\)/.test(select);

export async function fetchParentsWithChildren(opts: {
  parentTable: string;
  childTable: string;
  parentIdColumn?: string; // default 'id'
  childFkColumn: string;   // ex: 'quote_id'
  parentSelect?: string;   // default '*'
  parentFilter?: (q: any) => any;
  client?: SupabaseClient;
}) {
  const {
    parentTable,
    childTable,
    parentIdColumn = 'id',
    childFkColumn,
    parentSelect = '*',
    parentFilter,
    client = supabase,
  } = opts;

  // 1) Buscar pais sem embeds
  let parentQuery = client.from(parentTable).select(parentSelect);
  if (parentFilter) parentQuery = parentFilter(parentQuery as any) as any;
  const { data: parents, error: parentError } = await parentQuery;
  if (parentError) throw parentError;

  const parentIds = (parents || []).map((p: any) => p[parentIdColumn]).filter(Boolean);
  let childrenByParentId: Record<string, any[]> = {};

  // 2) Buscar filhos por IN em lote
  if (parentIds.length > 0) {
    const { data: children, error: childrenError } = await client
      .from(childTable)
      .select('*')
      .in(childFkColumn, parentIds);

    if (childrenError) {
      // Não obstaculiza a página: retorna pais sem filhos se houver RLS restrito
      console.warn(`[supabaseSafeQueries] Falha ao carregar filhos de ${childTable}:`, childrenError);
    } else if (children) {
      childrenByParentId = children.reduce((acc: Record<string, any[]>, ch: any) => {
        (acc[ch[childFkColumn]] ||= []).push(ch);
        return acc;
      }, {});
    }
  }

  return { parents: parents || [], childrenByParentId };
}

// Ajuda a construir políticas RLS sem recursão: apenas documentação de referência rápida
export const rlsPolicyPatterns = {
  notes: 'Use funções SECURITY DEFINER STABLE e evite referenciar a mesma tabela na policy; se necessário, use EXISTS para outras tabelas que não retornem ao alvo.',
  quote_responses_select: `CREATE POLICY "quote_responses_select" ON public.quote_responses
FOR SELECT USING (
  (public.get_user_role() = 'admin') OR
  supplier_id = public.get_current_user_supplier_id()
);`,
  quotes_select: `CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT USING (
  (public.get_user_role() = 'admin') OR
  client_id = (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
  created_by = auth.uid() OR
  supplier_id = public.get_current_user_supplier_id() OR
  (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
  (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
);`,
  quote_items_select: `CREATE POLICY "quote_items_select" ON public.quote_items
FOR SELECT USING (
  public.current_user_can_see_quote(quote_id)
);`,
};
