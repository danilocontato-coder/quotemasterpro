# ✅ Migração Completa: Arquitetura de Fornecedores

## 🎯 O Que Foi Implementado

Esta migração implementa uma **arquitetura de catálogo global** para fornecedores, eliminando duplicação e permitindo que múltiplos clientes se associem ao mesmo fornecedor.

---

## 📋 Mudanças Realizadas

### 1. **Schema de Validação** (`SupplierFormSchema.ts`)

❌ **ANTES**: Validação obrigatória de `client_id` para fornecedores locais
```typescript
// Bloqueava criação se type === 'local' && !client_id
```

✅ **DEPOIS**: `client_id` sempre opcional
```typescript
// Permite criar fornecedor sem client_id
// Associação é feita via client_suppliers
```

---

### 2. **Serviço de Criação** (`supplierCreationService.ts`)

❌ **ANTES**: Usava RPC `find_or_create_supplier_by_cnpj` que incluía `client_id`

✅ **DEPOIS**: Fluxo em 3 etapas
1. **Buscar por CNPJ** → Evita duplicação
2. **Criar no catálogo global** → Sem `client_id`
3. **Criar associação** → Tabela `client_suppliers`

**Novas funções**:
```typescript
findSupplierByCNPJ(cnpj: string): Promise<string | null>
createClientSupplierAssociation(clientId, supplierId): Promise<boolean>
```

---

### 3. **Hook de Admin** (`useSupabaseAdminSuppliers.ts`)

❌ **ANTES**: Query simples filtrando por `client_id`
```typescript
.from('suppliers')
.select('*')
.eq('client_id', clientId)
```

✅ **DEPOIS**: Query com JOIN usando `client_suppliers`
```typescript
.from('suppliers')
.select(`
  *,
  client_suppliers!inner(
    client_id,
    status,
    associated_at
  )
`)
```

---

### 4. **Documentação**

✅ **Criado**: `docs/SUPPLIER_ARCHITECTURE.md`
- Visão geral da arquitetura
- Estrutura das tabelas
- Fluxo de criação
- Queries corretas vs incorretas
- Exemplos de RLS policies
- Casos de uso

---

### 5. **Script de Migração**

✅ **Criado**: `scripts/migrate-suppliers-to-client-suppliers.sql`

**O que faz**:
1. Cria registros em `client_suppliers` para todos os suppliers com `client_id`
2. Verifica integridade dos dados
3. Limpa `client_id` da tabela `suppliers` (opcional)
4. Fornece script de rollback

---

## 🚀 Como Usar

### Para Desenvolvedores

#### Criar Novo Fornecedor

```typescript
import { createSupplierWithAuth } from '@/services/supplierCreationService';

const result = await createSupplierWithAuth({
  name: 'Fornecedor Exemplo',
  email: 'contato@exemplo.com',
  document_number: '12345678000199',
  state: 'BA',
  city: 'Salvador',
  specialties: ['Manutenção', 'Limpeza'],
  clientId: 'uuid-do-cliente', // Cliente que está criando a associação
  type: 'local'
});

// Resultado:
// - Busca fornecedor por CNPJ
// - Se já existe, reutiliza
// - Cria associação em client_suppliers
// - Envia notificações
```

#### Listar Fornecedores de um Cliente

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

### Para DBAs

#### 1. Executar Migração de Dados

```bash
# Conectar ao banco de dados
psql -U postgres -d cotiz

# Executar script
\i scripts/migrate-suppliers-to-client-suppliers.sql

# Verificar resultado
SELECT COUNT(*) FROM client_suppliers;
```

#### 2. Atualizar RLS Policies

```sql
-- Exemplo: Política para clientes verem apenas seus fornecedores
DROP POLICY IF EXISTS "suppliers_client_view_old" ON suppliers;

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

#### 3. Verificar Integridade

```sql
-- Fornecedores sem associação (devem ser raros)
SELECT id, name, cnpj, email
FROM suppliers s
WHERE NOT EXISTS (
  SELECT 1 FROM client_suppliers cs
  WHERE cs.supplier_id = s.id
);

-- Fornecedores com múltiplas associações (esperado)
SELECT 
  s.name,
  COUNT(DISTINCT cs.client_id) as num_clients,
  STRING_AGG(DISTINCT c.name, ', ') as clients
FROM suppliers s
JOIN client_suppliers cs ON cs.supplier_id = s.id
JOIN clients c ON c.id = cs.client_id
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT cs.client_id) > 1;
```

---

## 🔍 Testes Recomendados

### ✅ Teste 1: Criação sem Duplicação

1. Admin cria fornecedor "Fornecedor A" com CNPJ X para Cliente 1
2. Admin cria fornecedor "Fornecedor A" com CNPJ X para Cliente 2
3. **Resultado esperado**: 
   - 1 registro em `suppliers`
   - 2 registros em `client_suppliers`

### ✅ Teste 2: Query com Associações

```typescript
// Cliente 1 deve ver apenas seus fornecedores
const { data: client1Suppliers } = await supabase
  .from('suppliers')
  .select('*, client_suppliers!inner(client_id)')
  .eq('client_suppliers.client_id', client1Id);

// Fornecedor compartilhado deve aparecer para ambos
```

### ✅ Teste 3: RLS Funcionando

1. Login como Cliente 1
2. Tentar visualizar fornecedor associado apenas ao Cliente 2
3. **Resultado esperado**: Vazio (bloqueado por RLS)

---

## 🛠️ Rollback

Se precisar reverter a migração:

```sql
-- Restaurar client_id na tabela suppliers
UPDATE suppliers s
SET client_id = (
  SELECT cs.client_id
  FROM client_suppliers cs
  WHERE cs.supplier_id = s.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM client_suppliers cs
  WHERE cs.supplier_id = s.id
);

-- Deletar associações criadas
DELETE FROM client_suppliers
WHERE created_at >= '[DATA_DA_MIGRACAO]';
```

---

## 📚 Referências Técnicas

| Arquivo | Descrição |
|---------|-----------|
| `docs/SUPPLIER_ARCHITECTURE.md` | Documentação completa da arquitetura |
| `src/services/supplierCreationService.ts` | Lógica de criação e associação |
| `src/hooks/useSupabaseAdminSuppliers.ts` | Hook para listagem com JOIN |
| `src/components/suppliers/forms/SupplierFormSchema.ts` | Validação de formulário |
| `scripts/migrate-suppliers-to-client-suppliers.sql` | Script de migração |

---

## 🎉 Benefícios

### ✅ Sem Duplicação
Um CNPJ = Um fornecedor, independente de quantos clientes o usam

### ✅ Escalabilidade
Sistema preparado para marketplace de fornecedores

### ✅ Flexibilidade
Fornecedores podem existir antes de serem associados

### ✅ Rastreabilidade
Histórico completo de quando e como associações foram criadas

### ✅ Performance
Queries otimizadas com JOINs ao invés de múltiplas consultas

---

## ⚠️ Atenções

### Coluna `client_id` ainda existe em `suppliers`

Por compatibilidade legada, a coluna existe mas **NÃO DEVE SER USADA**.

❌ **Não fazer**:
```typescript
await supabase.from('suppliers').insert({ client_id: 'xxx' });
```

✅ **Fazer**:
```typescript
// 1. Criar fornecedor
const supplier = await supabase.from('suppliers').insert({ ... });

// 2. Criar associação
await supabase.from('client_suppliers').insert({
  client_id: 'xxx',
  supplier_id: supplier.id
});
```

---

## 📞 Suporte

Dúvidas ou problemas com a migração?

1. Consulte `docs/SUPPLIER_ARCHITECTURE.md`
2. Revise o código em `src/services/supplierCreationService.ts`
3. Execute queries de verificação do script de migração

---

**Data da Migração**: 2025-01-XX  
**Versão**: 2.0  
**Status**: ✅ Completo
