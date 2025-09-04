# RLS Anti-Recursion Playbook (QuoteMaster Pro)

Problema
- Erro 42P17: "infinite recursion detected in policy" em tabelas com políticas que se referem entre si (ex.: quotes ↔ quote_suppliers ↔ quote_responses) ou quando selects embutidos exigem reavaliação de políticas.

Causas Comuns
- Policy de A usando SELECT em B, e policy de B usando SELECT em A.
- Policy de uma tabela referenciando a própria tabela em subselects que disparam a própria policy novamente.
- Frontend usando selects com embed (ex.: select `*, quote_items(*)`) que força PostgREST a navegar por relações cobertas por RLS, agravando ciclos.

Padrão de Correção (Banco de Dados)
1) Use funções SECURITY DEFINER STABLE para dados de contexto
   - Ex.: public.get_user_role(), public.get_current_user_supplier_id().
   - Configure `SET search_path TO 'public'` na função.

2) Evite dependência circular entre policies
   - Em vez de consultar quotes dentro da policy de quote_responses e vice-versa, use condições diretas (supplier_id = get_current_user_supplier_id()) e regras de visibilidade simples.

3) Se precisar de lógica complexa, use função can_view_X
   - Ex.: public.current_user_can_see_quote(quote_id text) retorna boolean sem SELECT recursivo.

4) Exemplos prontos (seguros)
- quote_responses (SELECT):
  CREATE POLICY "quote_responses_select" ON public.quote_responses
  FOR SELECT USING (
    (public.get_user_role() = 'admin') OR
    supplier_id = public.get_current_user_supplier_id()
  );

- quotes (SELECT):
  CREATE POLICY "quotes_select_policy" ON public.quotes
  FOR SELECT USING (
    (public.get_user_role() = 'admin') OR
    client_id = (SELECT profiles.client_id FROM profiles WHERE profiles.id = auth.uid()) OR
    created_by = auth.uid() OR
    supplier_id = public.get_current_user_supplier_id() OR
    (supplier_scope = 'global' AND status IN ('sent','receiving')) OR
    (supplier_scope = 'local' AND supplier_id IS NULL AND status IN ('sent','receiving'))
  );

- quote_items (SELECT):
  CREATE POLICY "quote_items_select" ON public.quote_items
  FOR SELECT USING (
    public.current_user_can_see_quote(quote_id)
  );

Checklist de Aplicação
- [ ] Procurar policies que consultam a mesma tabela ou tabelas que se consultam mutuamente.
- [ ] Mover lógica de contexto para funções SECURITY DEFINER STABLE.
- [ ] Simplificar USING/WITH CHECK para não depender de consultas que voltem para a tabela alvo.
- [ ] Reavaliar se embeds são necessários (geralmente não; prefira múltiplas consultas menores).

Padrão de Correção (Frontend)
1) Evitar selects com embed em telas sensíveis a RLS
   - Errado: .select("*, quote_items (*)")
   - Certo: buscar quotes e depois quote_items em chamada separada com IN por quote_id.

2) Utilitário recomendado
   - Use src/lib/supabaseSafeQueries.ts:
     - isEmbeddedSelect(select) para alertar em dev.
     - fetchParentsWithChildren(...) para montar pais + filhos sem embeds.

3) Exemplo (Quotes + Itens)
   const { parents, childrenByParentId } = await fetchParentsWithChildren({
     parentTable: 'quotes',
     childTable: 'quote_items',
     childFkColumn: 'quote_id',
     parentFilter: (q) => q
       .eq('supplier_scope', 'global')
       .in('status', ['sent','receiving'])
       .order('created_at', { ascending: false })
   });
   const quotes = parents.map((p) => ({ ...p, items: childrenByParentId[p.id] || [] }));

Boas Práticas de Segurança
- Funções: sempre STABLE, SECURITY DEFINER, search_path = public.
- Policies: mínima superfície de consulta; evite JOINs implícitos via embeds.
- Teste sempre com usuários de papéis distintos (admin, manager, collaborator, supplier).

Como reutilizar em outros módulos
- Approvals/Payments/Products: aplicar o mesmo padrão: policies simples e, no frontend, evitar embeds quando a policy do filho depende do pai.
- Para qualquer módulo novo, comece criando funções de contexto e uma função can_view_entity(opcional), depois escreva as policies.
