# Correção e Padronização do `local_code` para Fornecedores

## 🐛 Problema Identificado

**Data**: 2025-01-14  
**Contexto**: Painel do Fornecedor (Supplier)  
**Sintoma**: O campo `local_code` (ex: RFQ36) não estava sendo exibido nas cotações
- Modal de visualização mostrava título vazio
- Tabela principal exibia UUID do banco ao invés do código amigável

**Causa raiz**: O campo `local_code` não estava sendo:
1. Incluído nas queries SELECT do Supabase
2. Mapeado no objeto retornado pelo hook

---

## ✅ Solução Implementada

### Arquivo: `src/hooks/useSupabaseSupplierQuotes.ts`

#### 1. Query de cotações direcionadas (quote_suppliers)

**Linhas ~173-189**:
```typescript
.select(`
  quote_id,
  quotes!inner (
    id,
    local_code,        // ← ADICIONADO
    title,
    description,
    status,
    client_id,
    client_name,
    total,
    items_count,
    responses_count,
    deadline,
    requires_visit,
    visit_deadline,
    created_at,
    updated_at
  )
`)
```

#### 2. Query de respostas do fornecedor (quote_responses)

**Linhas ~209-226**:
```typescript
.select(`
  quote_id,
  status,
  created_at,
  quotes!inner (
    id,
    local_code,        // ← ADICIONADO
    title,
    description,
    status,
    client_id,
    client_name,
    total,
    items_count,
    responses_count,
    deadline,
    requires_visit,
    visit_deadline,
    created_at,
    updated_at
  )
`)
```

#### 3. Mapeamento do objeto SupplierQuote

**Linhas ~268-284**:
```typescript
return {
  id: quote.id,
  local_code: quote.local_code,  // ← ADICIONADO
  title: quote.title,
  description: quote.description || '',
  client: clientName,
  clientId: quote.client_id,
  supplierId: user.supplierId,
  client_name: clientName,
  status: getSupplierStatus(quote.status, response?.status),
  deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  estimatedValue: quote.total > 0 ? quote.total : undefined,
  createdAt: quote.created_at,
  items: [],
  sentAt: response ? response.created_at : undefined,
  requires_visit: quote.requires_visit || false,
  visit_deadline: quote.visit_deadline,
};
```

---

## 📊 Resultado

### Antes ❌
- **Modal**: ` - ar condicionado` (título vazio)
- **Tabela**: UUID do banco (ex: `550e8400-e29b-41d4-a716-446655440000`)

### Depois ✅
- **Modal**: `RFQ36 - ar condicionado`
- **Tabela**: `RFQ36`

---

## 🛡️ Blindagem contra Bugs Futuros

### ✅ Checklist para Novos Hooks de Cotações

Sempre que criar/modificar hooks que busquem cotações (`quotes`), verificar:

#### 1. Query SELECT inclui `local_code`
```typescript
.select(`
  quotes (
    id,
    local_code,  // ← OBRIGATÓRIO
    title,
    ...
  )
`)
```

#### 2. Mapeamento do objeto inclui `local_code`
```typescript
return {
  id: quote.id,
  local_code: quote.local_code,  // ← OBRIGATÓRIO
  title: quote.title,
  ...
}
```

#### 3. Interface TypeScript define `local_code`
```typescript
interface Quote {
  id: string;
  local_code?: string;  // ← OBRIGATÓRIO
  title: string;
  ...
}
```

#### 4. Componentes UI usam `local_code` ao invés de `id`
```typescript
// ❌ EVITAR
<span>{quote.id}</span>

// ✅ CORRETO
<span>{quote.local_code}</span>
```

---

## 📍 Arquivos que devem seguir este padrão

- ✅ `src/hooks/useSupabaseSupplierQuotes.ts` (corrigido)
- ⚠️ `src/hooks/useQuotes.ts` (verificar)
- ⚠️ `src/hooks/useSupplierQuoteOperations.ts` (verificar)
- ⚠️ Qualquer novo hook que busque cotações

---

## 🔍 Como Validar

### 1. Verificar no Supabase
A tabela `quotes` deve ter o campo `local_code` preenchido.

### 2. Testar no painel Fornecedor
- Abrir modal de cotação → verificar título exibe `RFQ##`
- Tabela de cotações → verificar coluna ID exibe `RFQ##`

### 3. Testar no painel Cliente
Verificar se `local_code` aparece corretamente.

### 4. Console do navegador
Verificar se objeto `quote` contém `local_code`:
```javascript
console.log(quote.local_code); // Deve exibir "RFQ36"
```

---

## 🔗 Documentação Relacionada

- [QUOTES_CREATION_FIX.md](./QUOTES_CREATION_FIX.md) - Padrão de criação de cotações
- [QUOTE_NUMBERING_FIX.md](./QUOTE_NUMBERING_FIX.md) - Separação de `id` e `local_code`
- [SUPPLIER_AUTH_STANDARDIZATION.md](./SUPPLIER_AUTH_STANDARDIZATION.md) - Padrão de autenticação
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) - Padrões gerais de desenvolvimento

---

## 📝 Notas Técnicas

### Geração do `local_code`
- **Função**: `next_quote_id_by_client()` (Supabase)
- **Formato**: `RFQ##` (ex: RFQ01, RFQ02, ..., RFQ99)
- **Escopo**: Único por cliente (`client_id`)
- **Tabela de controle**: `client_quote_counters`

### Uso Correto
- **Para exibição ao usuário**: Use `local_code`
- **Para joins/queries internas**: Use `id` (UUID)
- **Para URLs amigáveis**: Considere usar `local_code`

### Trigger de Geração
```sql
CREATE TRIGGER trg_quotes_set_local_code
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_local_code();
```

---

## 🎓 Lições Aprendidas

1. **Sempre incluir campos de identificação amigável** nas queries Supabase
2. **Mapear todos os campos essenciais** nos objetos retornados por hooks
3. **Documentar correções imediatamente** para prevenir recorrência
4. **Criar checklists** para validação de padrões
5. **Testar em todos os painéis** (Cliente, Fornecedor, Admin)

---

**Última atualização**: 2025-01-14  
**Status**: ✅ Implementado e validado
