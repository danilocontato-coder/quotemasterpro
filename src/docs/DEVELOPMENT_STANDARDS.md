# Padrões de Desenvolvimento - Cotiz

## 🎯 Objetivo

Estabelecer padrões de código e boas práticas para manter a consistência, prevenir bugs recorrentes e facilitar a manutenção da plataforma Cotiz.

---

## 📚 Documentos Relacionados

1. **[SUPPLIER_LOCAL_CODE_FIX.md](./SUPPLIER_LOCAL_CODE_FIX.md)** - Uso correto do `local_code` em queries
2. **[QUOTES_CREATION_FIX.md](./QUOTES_CREATION_FIX.md)** - Padrão de criação de cotações (RLS e deadline)
3. **[QUOTE_NUMBERING_FIX.md](./QUOTE_NUMBERING_FIX.md)** - Separação de `id` e `local_code`
4. **[SUPPLIER_AUTH_STANDARDIZATION.md](./SUPPLIER_AUTH_STANDARDIZATION.md)** - Padrão de autenticação de fornecedores

---

## 🔧 Padrões de Hooks Supabase

### ✅ Nomenclatura de Hooks

```typescript
// Hooks de leitura (queries)
useQuotes()           // Buscar cotações
useSuppliers()        // Buscar fornecedores
useProducts()         // Buscar produtos

// Hooks de operações (mutations)
useQuoteOperations()      // Criar/editar/excluir cotações
useSupplierOperations()   // CRUD de fornecedores

// Hooks com prefixo "useSupabase" para operações diretas
useSupabaseQuotes()         // Operações Supabase de cotações
useSupabaseSupplierQuotes() // Operações Supabase do painel fornecedor
```

### ✅ Query de Cotações - Regras Obrigatórias

**SEMPRE incluir estes campos em queries de `quotes`:**

```typescript
.select(`
  id,
  local_code,        // ← OBRIGATÓRIO (exibição amigável)
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
`)
```

**SEMPRE mapear no objeto retornado:**

```typescript
return {
  id: quote.id,                    // UUID técnico
  local_code: quote.local_code,    // ← OBRIGATÓRIO (RFQ##)
  title: quote.title,
  description: quote.description || '',
  status: quote.status,
  client_id: quote.client_id,
  client_name: quote.client_name,
  total: quote.total,
  deadline: quote.deadline,
  requires_visit: quote.requires_visit || false,
  visit_deadline: quote.visit_deadline,
  createdAt: quote.created_at,
  updatedAt: quote.updated_at,
};
```

### ✅ Busca de Fornecedores em Cotações

**SEMPRE buscar da tabela `quote_suppliers` (fonte de verdade):**

```typescript
// ❌ EVITAR - usar selected_supplier_ids (pode estar desatualizado)
const { data } = await supabase
  .from('suppliers')
  .select('*')
  .in('id', quote.selected_supplier_ids);

// ✅ CORRETO - buscar de quote_suppliers
const { data } = await supabase
  .from('quote_suppliers')
  .select(`
    supplier_id,
    suppliers (
      id,
      name,
      status,
      phone,
      whatsapp
    )
  `)
  .eq('quote_id', quote.id);
```

**Regras:**
- **NUNCA** usar `selected_supplier_ids` para exibição (pode estar desatualizado)
- **USAR** `selected_supplier_ids` apenas para criação/atualização inicial
- **VERIFICAR** que `suppliers_sent_count` corresponde ao total em `quote_suppliers`

### ✅ Tratamento de Erros

**Padrão para hooks:**

```typescript
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

const fetchData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const { data, error: supabaseError } = await supabase
      .from('quotes')
      .select('*');
    
    if (supabaseError) {
      console.error('[fetchData] Supabase error:', supabaseError);
      throw supabaseError;
    }
    
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    setError(errorMessage);
    toast.error('Erro ao buscar dados');
    console.error('[fetchData] Error:', err);
    return null;
  } finally {
    setIsLoading(false);
  }
};
```

**Logs obrigatórios:**
- Prefixar com nome da função: `[functionName]`
- Logar erro completo no console
- Mostrar mensagem amigável ao usuário via `toast`

---

## 🏗️ Padrões de Componentes

### ✅ Estrutura de Componentes

```
src/components/
├── quotes/
│   ├── QuoteList.tsx           // Lista principal
│   ├── QuoteCard.tsx           // Card individual
│   ├── QuoteViewModal.tsx      // Modal de visualização
│   ├── CreateQuoteModal.tsx    // Modal de criação
│   └── QuoteFilters.tsx        // Filtros
```

**Regras:**
- Um componente por arquivo
- Nome do arquivo = nome do componente (PascalCase)
- Agrupar componentes relacionados em pastas
- Máximo 300 linhas por componente (refatorar se ultrapassar)

### ✅ Uso de `local_code` em Componentes

```typescript
// ❌ EVITAR - Usar UUID técnico
<h2>{quote.id}</h2>
<Badge>{quote.id}</Badge>

// ✅ CORRETO - Usar código amigável
<h2>{quote.local_code} - {quote.title}</h2>
<Badge>{quote.local_code}</Badge>
```

**Exceção**: Use `id` apenas para:
- Chaves de listas (`key={quote.id}`)
- Parâmetros de rotas internas
- Joins no banco de dados

---

## 🎨 Padrões de UI/Design

### ✅ Uso de Cores Semânticas

**SEMPRE usar tokens do design system:**

```typescript
// ❌ EVITAR - Cores diretas
className="text-white bg-blue-500"

// ✅ CORRETO - Tokens semânticos
className="text-primary bg-background"
```

**Tokens disponíveis** (em `index.css` e `tailwind.config.ts`):
- `bg-background` / `text-foreground`
- `bg-primary` / `text-primary-foreground`
- `bg-card` / `text-card-foreground`
- `bg-accent` / `text-accent-foreground`

### ✅ Badges de Status

```typescript
// Status de cotações
const STATUS_VARIANTS = {
  draft: 'secondary',       // Cinza
  sent: 'default',          // Azul
  receiving: 'default',     // Azul
  received: 'outline',      // Borda
  approved: 'success',      // Verde
  rejected: 'destructive',  // Vermelho
  paid: 'success',          // Verde
  cancelled: 'secondary',   // Cinza
};

<Badge variant={STATUS_VARIANTS[quote.status]}>
  {quote.status}
</Badge>
```

---

## 🗄️ Padrões de Banco de Dados

### ✅ Campos Obrigatórios em Tabelas

**Toda tabela deve ter:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

**Tabelas de entidades principais devem ter:**
```sql
client_id UUID REFERENCES clients(id),  -- Escopo por cliente
active BOOLEAN DEFAULT true             -- Soft delete
```

### ✅ Campos de Identificação Amigável

**Para entidades que usuários visualizam:**
```sql
-- Cotações
local_code TEXT,  -- RFQ01, RFQ02, ...

-- Pagamentos
local_code TEXT,  -- PG001, PG002, ...

-- Produtos
code TEXT,        -- PROD0001, PROD0002, ...
```

**Geração automática via trigger:**
```sql
CREATE TRIGGER trg_set_local_code
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_local_code();
```

### ✅ Row Level Security (RLS)

**Sempre habilitar RLS:**
```sql
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
```

**Padrão de políticas:**
```sql
-- SELECT: Usuários veem apenas dados do seu cliente
CREATE POLICY "quotes_select_own_client"
ON quotes FOR SELECT
USING (client_id = get_current_user_client_id());

-- INSERT: Apenas membros do cliente podem inserir
CREATE POLICY "quotes_insert_own_client"
ON quotes FOR INSERT
WITH CHECK (
  client_id = get_current_user_client_id()
  AND auth.uid() = created_by
);

-- UPDATE: Apenas criador ou admin do cliente
CREATE POLICY "quotes_update_own"
ON quotes FOR UPDATE
USING (
  client_id = get_current_user_client_id()
  AND (auth.uid() = created_by OR has_role_text(auth.uid(), 'admin'))
);
```

---

## 🧪 Padrões de Validação

### ✅ Validação de Campos Obrigatórios

**Frontend (zod):**
```typescript
const quoteSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  deadline: z.string().nullable(),
  items: z.array(quoteItemSchema).min(1, 'Adicione pelo menos 1 item'),
});
```

**Backend (trigger):**
```sql
CREATE FUNCTION validate_quote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NULL OR btrim(NEW.title) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório';
  END IF;
  
  IF NEW.client_id IS NULL THEN
    RAISE EXCEPTION 'client_id é obrigatório';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### ✅ Validação de Datas

**SEMPRE enviar timestamps como ISO ou null:**

```typescript
// ❌ EVITAR
deadline: formData.deadline  // Pode ser objeto/undefined

// ✅ CORRETO
deadline: formData.deadline 
  ? new Date(formData.deadline).toISOString() 
  : null
```

---

## 📋 Checklist Pré-Commit

Antes de fazer commit/PR, verificar:

### ✅ Código
- [ ] Campos de exibição amigável (`local_code`) estão nas queries
- [ ] Mapeamentos de objeto estão completos
- [ ] Interfaces TypeScript estão atualizadas
- [ ] Erros são tratados e logados
- [ ] Cores usam tokens semânticos (não cores diretas)
- [ ] Componentes têm no máximo 300 linhas

### ✅ Banco de Dados
- [ ] RLS habilitado em novas tabelas
- [ ] Políticas RLS criadas para SELECT/INSERT/UPDATE/DELETE
- [ ] Triggers de `updated_at` configurados
- [ ] Campos de auditoria (`created_by`, `updated_by`) preenchidos

### ✅ Testes
- [ ] Testado no painel correto (Cliente/Fornecedor/Admin)
- [ ] Console do navegador sem erros
- [ ] Toast de sucesso/erro aparece corretamente
- [ ] Validação de formulários funciona
- [ ] RLS testado (usuário não vê dados de outro cliente)

### ✅ Documentação
- [ ] README atualizado se necessário
- [ ] Correções importantes documentadas em `/docs`
- [ ] Comentários em código complexo

---

## 🔍 Como Usar Esta Documentação

### Para Desenvolvedores Novos
1. Ler todos os documentos em `/docs`
2. Seguir os padrões estabelecidos
3. Consultar checklists antes de commits
4. Perguntar se tiver dúvidas

### Para Code Review
1. Verificar conformidade com padrões
2. Validar checklist pré-commit
3. Testar RLS e permissões
4. Verificar logs e tratamento de erros

### Para Debugging
1. Consultar documentos de correções anteriores
2. Verificar se padrões foram seguidos
3. Adicionar nova correção à documentação

### Para Refatoração
1. Identificar código que não segue padrões
2. Aplicar padrões estabelecidos
3. Atualizar documentação se necessário

---

## 🔄 Manutenção da Documentação

### Quando Atualizar
- Sempre que uma correção importante for feita
- Quando novos padrões forem estabelecidos
- Quando bugs recorrentes forem identificados

### Como Atualizar
1. Criar novo documento em `/docs` OU
2. Adicionar seção em documento existente
3. Atualizar este `DEVELOPMENT_STANDARDS.md` com link

### Responsabilidade
- **Desenvolvedor**: Cria/atualiza documentação ao implementar correção
- **Code Reviewer**: Valida documentação no PR
- **Tech Lead**: Garante consistência dos padrões

---

## 📖 Referências Externas

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/adding-custom-styles)

---

**Última atualização**: 2025-01-14  
**Versão**: 1.0  
**Mantido por**: Equipe de Desenvolvimento Cotiz
