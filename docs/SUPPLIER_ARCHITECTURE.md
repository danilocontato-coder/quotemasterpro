# Arquitetura de Fornecedores - Catálogo Global com Associações

## Visão Geral

O sistema Cotiz utiliza uma arquitetura de **catálogo global de fornecedores** com **associações por cliente**. Isso permite que:

1. **Fornecedores não sejam duplicados** - Um fornecedor com mesmo CNPJ existe apenas uma vez no sistema
2. **Múltiplos clientes podem se associar ao mesmo fornecedor** - Através da tabela `client_suppliers`
3. **Fornecedores podem existir sem vínculo inicial** - Podendo ser associados posteriormente

---

## Estrutura de Dados

### Tabela: `suppliers` (Catálogo Global)

Armazena os dados básicos de todos os fornecedores no sistema:

```sql
suppliers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  address JSONB,
  specialties TEXT[],
  type TEXT, -- 'local' | 'certified'
  status TEXT DEFAULT 'active',
  bank_data JSONB,
  -- client_id (OBSOLETO - não usar mais)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**⚠️ IMPORTANTE**: A coluna `client_id` ainda existe na tabela por compatibilidade legada, mas **NÃO DEVE SER USADA**. Use `client_suppliers` para associações.

---

### Tabela: `client_suppliers` (Associações)

Gerencia quais fornecedores estão vinculados a quais clientes:

```sql
client_suppliers (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'pending'
  associated_at TIMESTAMP,
  invited_at TIMESTAMP,
  invitation_accepted_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(client_id, supplier_id)
)
```

**Campos principais**:
- `status`: Indica se a associação está ativa
- `associated_at`: Quando o fornecedor foi associado ao cliente
- `invited_at`: Quando o cliente convidou o fornecedor
- `invitation_accepted_at`: Quando o fornecedor aceitou o convite

---

## Fluxo de Criação de Fornecedor

### 1. Buscar por CNPJ

Antes de criar, **sempre verificar** se já existe um fornecedor com o mesmo CNPJ:

```typescript
const existingSupplierId = await findSupplierByCNPJ(cnpj);
```

### 2A. Fornecedor Novo

Se não existir, criar no catálogo global **SEM `client_id`**:

```typescript
const { data: newSupplier } = await supabase
  .from('suppliers')
  .insert({
    name: 'Fornecedor Novo',
    cnpj: '12345678000199',
    email: 'contato@fornecedor.com',
    // NÃO incluir client_id
  })
  .select('id')
  .single();
```

### 2B. Fornecedor Existente

Se já existir, apenas usar o ID existente e pular para o passo 3.

### 3. Criar Associação

Criar o vínculo na tabela `client_suppliers`:

```typescript
await supabase
  .from('client_suppliers')
  .upsert({
    client_id: clientId,
    supplier_id: supplierId,
    status: 'active',
    associated_at: new Date().toISOString()
  }, {
    onConflict: 'client_id,supplier_id'
  });
```

### 4. Criar Auth User (apenas para novos)

Se o fornecedor for novo, criar usuário de autenticação:

```typescript
if (isNewSupplier) {
  await supabase.functions.invoke('create-auth-user', {
    body: {
      email: supplierEmail,
      password: tempPassword,
      role: 'supplier',
      supplierId: supplierId
    }
  });
}
```

---

## Queries Corretas

### ❌ ERRADO - Filtrar por client_id diretamente

```typescript
// NÃO FAZER ISSO
const { data } = await supabase
  .from('suppliers')
  .select('*')
  .eq('client_id', clientId);
```

### ✅ CORRETO - Usar JOIN com client_suppliers

```typescript
const { data } = await supabase
  .from('suppliers')
  .select(`
    *,
    client_suppliers!inner(
      client_id,
      status,
      associated_at
    )
  `)
  .eq('client_suppliers.client_id', clientId)
  .eq('client_suppliers.status', 'active');
```

---

## RLS Policies

### Exemplo de Política Correta

```sql
-- Clientes veem apenas fornecedores associados a eles
CREATE POLICY "suppliers_client_view_associated" 
ON suppliers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM client_suppliers cs
    WHERE cs.supplier_id = suppliers.id
    AND cs.client_id = get_current_user_client_id()
    AND cs.status = 'active'
  )
);
```

### Exemplo de Política ERRADA (antiga)

```sql
-- ❌ NÃO USAR MAIS
CREATE POLICY "suppliers_client_view" 
ON suppliers
FOR SELECT
USING (client_id = get_current_user_client_id());
```

---

## Migração de Dados Legados

Para migrar fornecedores que ainda usam `client_id`:

```sql
-- Criar associações para fornecedores com client_id
INSERT INTO client_suppliers (client_id, supplier_id, status, associated_at)
SELECT client_id, id, 'active', NOW()
FROM suppliers
WHERE client_id IS NOT NULL
ON CONFLICT (client_id, supplier_id) DO NOTHING;

-- Limpar client_id (após confirmar migração)
UPDATE suppliers SET client_id = NULL WHERE client_id IS NOT NULL;
```

**Script completo**: `scripts/migrate-suppliers-to-client-suppliers.sql`

---

## Benefícios da Nova Arquitetura

### ✅ Sem Duplicação
Um CNPJ = Um fornecedor no sistema

### ✅ Compartilhamento Inteligente
Múltiplos clientes podem usar o mesmo fornecedor

### ✅ Flexibilidade
Fornecedores podem ser criados antes de serem associados

### ✅ Histórico
Acompanhar quando e como associações foram criadas

### ✅ Escalabilidade
Sistema preparado para marketplace de fornecedores

---

## Casos de Uso

### Caso 1: Admin cria fornecedor para Cliente A

1. Admin cria fornecedor → `suppliers` (sem `client_id`)
2. Sistema cria associação → `client_suppliers(client_a, supplier_x)`
3. Cliente A vê o fornecedor em sua lista

### Caso 2: Cliente B quer usar mesmo fornecedor

1. Cliente B busca fornecedor por CNPJ → encontra `supplier_x`
2. Sistema cria nova associação → `client_suppliers(client_b, supplier_x)`
3. Agora ambos os clientes veem o mesmo fornecedor

### Caso 3: Fornecedor se cadastra diretamente

1. Fornecedor preenche formulário → cria `suppliers` (sem `client_id`)
2. Fornecedor fica em catálogo global
3. Qualquer cliente pode posteriormente criar associação

---

## Checklist de Validação

Ao trabalhar com fornecedores, **sempre**:

- [ ] Buscar por CNPJ antes de criar
- [ ] Criar fornecedor **sem** `client_id`
- [ ] Criar associação em `client_suppliers`
- [ ] Usar JOINs com `client_suppliers` nas queries
- [ ] Verificar RLS policies usam `client_suppliers`
- [ ] Nunca ler ou escrever em `suppliers.client_id`

---

## Referências

- Serviço de criação: `src/services/supplierCreationService.ts`
- Hook admin: `src/hooks/useSupabaseAdminSuppliers.ts`
- Schema de validação: `src/components/suppliers/forms/SupplierFormSchema.ts`
- Script de migração: `scripts/migrate-suppliers-to-client-suppliers.sql`
- Documentação de fluxo: `src/docs/SUPPLIER_CREATION_FLOW.md`
