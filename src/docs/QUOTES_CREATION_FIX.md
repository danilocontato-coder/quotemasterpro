# Correção: Falha ao criar cotação (RLS e deadline)

Data: 2025-09-05
Status: Resolvido

Resumo
- Sintoma: Ao clicar em "Criar a cotação", falhava com o erro: new row violates row-level security policy for table "quotes". Logs mostravam deadline inválido.
- Causa raiz:
  1) O campo deadline era enviado como objeto/undefined (ex.: {"_type":"undefined","value":"undefined"}) em vez de timestamp ISO ou null.
  2) A criação fazia insert com select('*').single() imediato, podendo esbarrar na SELECT policy logo após o INSERT. Endurecemos a operação para evitar essa sensibilidade.

Correções aplicadas
1) Normalização do deadline no front:
   - Agora mapeamos corretamente: deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
   - Garante envio de valor válido (ISO) ou null, nunca objeto/undefined.

2) Criação em duas etapas (compatível com RLS):
   - Passo 1: INSERT mínimo apenas com os campos exigidos pela política de INSERT (id, title, client_id obtido via RPC get_current_user_client_id, client_name e created_by = auth.uid()).
   - Passo 2: UPDATE dos campos opcionais (description, deadline, supplier_scope, items_count, etc.).
   - Busca posterior do registro com select por id (maybeSingle), evitando .select().single() acoplado ao INSERT.

Arquivos alterados
- src/components/quotes/CreateQuoteModalSupabase.tsx
  - Mapeamento correto do deadline para ISO ou null.
  - Logs adicionais de validação (passos 1–5) e preparo do payload.

- src/hooks/useSupabaseQuotes.ts
  - createQuote: troca do padrão insert().select('*').single() por inserção simples + fetch posterior.
  - Payload mínimo para satisfazer RLS: { id, title, client_id (RPC), client_name, created_by }.
  - UPDATE subsequente dos campos opcionais e inserção de itens.

Motivação técnica
- RLS em quotes (quotes_insert_simple) exige: auth.uid() não nulo, created_by = auth.uid(), client_id não nulo e igual ao profiles.client_id do usuário. A abordagem em duas etapas garante o cumprimento desses critérios antes de qualquer leitura adicional.
- Normalizar deadline previne envio de valores inválidos que poderiam causar rejeição no insert/update.

Como validar
1) Abrir modal de nova cotação, preencher Título, adicionar pelo menos 1 item, selecionar 1 fornecedor, avançar até o passo 5.
2) Confirmar criação; verificar toast de sucesso e presença da nova cotação na lista.
3) Conferir console: deve exibir logs de validação e payload sem deadline inválido.

Lições para futuras alterações
- Sempre enviar timestamps como ISO (string) ou null.
- Para tabelas com RLS estrita, preferir inserir o mínimo necessário para passar a policy e atualizar na sequência.
- Quando houver SELECT policy mais restritiva, evite .select().single() acoplado ao INSERT.
