# Guia de Arquitetura Multi-Tenant do Cotiz

## 📋 Visão Geral

O Cotiz é uma plataforma **multi-tenant** onde cada cliente (condomínio/empresa) possui dados completamente isolados. Este documento explica como funciona o isolamento de dados e como desenvolver novas features respeitando este padrão.

## 🔐 Princípios de Segurança

### 1. Isolamento por `client_id`
- Toda tabela que armazena dados de clientes DEVE ter coluna `client_id` (UUID, NOT NULL)
- RLS policies DEVEM usar `get_current_user_client_id()` ou `get_current_user_supplier_id()`
- **NUNCA** hardcodar `client_id` no código frontend

### 2. Funções SQL Seguras (SECURITY DEFINER)
```sql
-- ✅ CORRETO
CREATE FUNCTION get_current_user_client_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$;
```

### 3. RLS Policies Padrão

**Exemplo: Tabela `quotes`**
```sql
-- SELECT: Ver apenas cotações do seu cliente
CREATE POLICY quotes_select_own_client ON public.quotes
FOR SELECT
USING (client_id = get_current_user_client_id());

-- INSERT: Criar apenas com seu client_id
CREATE POLICY quotes_insert_own_client ON public.quotes
FOR INSERT
WITH CHECK (
  client_id = get_current_user_client_id()
  AND created_by = auth.uid()
);

-- Admin bypass
CREATE POLICY quotes_admin_all ON public.quotes
FOR ALL
USING (get_user_role() = 'admin');
```

## 🛠️ Como Desenvolver Novas Features

### Passo 1: Criar tabela com `client_id`
```sql
CREATE TABLE public.minha_tabela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

-- Criar policies
CREATE POLICY minha_tabela_select ON public.minha_tabela
FOR SELECT
USING (client_id = get_current_user_client_id());
```

### Passo 2: Hook genérico
```typescript
export const useMinhaFeature = () => {
  const { user } = useAuth(); // ✅ Usar contexto, não hardcoded
  
  const fetch = async () => {
    // ❌ ERRADO
    // const { data } = await supabase
    //   .from('minha_tabela')
    //   .eq('client_id', 'uuid-fixo');
    
    // ✅ CORRETO - RLS filtra automaticamente
    const { data } = await supabase
      .from('minha_tabela')
      .select('*');
    
    logger.tenant('FETCH_MINHA_FEATURE', { 
      clientId: user?.clientId, 
      count: data?.length 
    });
  };
};
```

### Passo 3: Testes de isolamento
```typescript
// Testar que cliente A não vê dados do cliente B
describe('Isolamento Multi-Tenant', () => {
  it('deve mostrar apenas fornecedores do cliente logado', async () => {
    // Login como cliente A
    const suppliersA = await fetchSuppliers();
    
    // Login como cliente B
    const suppliersB = await fetchSuppliers();
    
    // Verificar que não há interseção
    expect(suppliersA).not.toEqual(suppliersB);
  });
});
```

## 📊 Admin Simulation (Visualizar Como Cliente)

### Como funciona
1. Admin cria token de simulação: `/admin/clients` → "Ver como cliente"
2. Token armazenado em `sessionStorage` com metadados:
   ```json
   {
     "adminId": "uuid-admin",
     "targetClientId": "uuid-cliente",
     "targetRole": "manager",
     "targetClientName": "Condomínio Azul"
   }
   ```
3. `AuthContext` detecta token e cria usuário simulado:
   ```typescript
   id: `admin_simulated_${targetClientId}`,
   clientId: targetClientId,
   role: 'manager'
   ```
4. Todas as queries RLS usam este `clientId` simulado

### Implementar simulação em novos hooks
```typescript
const { user } = useAuth();

// Detectar modo simulação
const isAdminMode = user?.id?.startsWith('admin_simulated_');

// Usar clientId do contexto (funciona em simulação e modo normal)
const effectiveClientId = user?.clientId || profile?.client_id;

logger.tenant('OPERATION', {
  clientId: effectiveClientId,
  isAdminMode,
  actualUser: user?.id
});
```

## 🔍 Como Debugar Problemas de Isolamento

### 1. Verificar client_id no console
```typescript
const { data } = await supabase.rpc('get_current_user_client_id');
console.log('🔍 Current client_id:', data);
```

### 2. Verificar RLS policies
```sql
-- Ver todas as policies de uma tabela
SELECT * FROM pg_policies WHERE tablename = 'quotes';

-- Testar policy manualmente
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM public.quotes; -- Deve retornar apenas do cliente
```

### 3. Logs de auditoria
```typescript
// Ver últimas operações do cliente
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

## ⚠️ Armadilhas Comuns

### ❌ Hardcodar client_id
```typescript
// NUNCA FAZER ISSO
const clientId = '123e4567-e89b-12d3-a456-426614174000';
```

### ❌ Bypassar RLS no frontend
```typescript
// NUNCA usar service_role no frontend
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY); // 🚨 PERIGO
```

### ❌ Esquecer RLS em novas tabelas
```sql
-- SEMPRE habilitar RLS
ALTER TABLE public.nova_tabela ENABLE ROW LEVEL SECURITY;
```

### ❌ Policies sem SECURITY DEFINER
```sql
-- ❌ ERRADO (causa recursão)
CREATE POLICY my_policy ON public.table
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ✅ CORRETO (usa função segura)
CREATE POLICY my_policy ON public.table
USING (has_role_text(auth.uid(), 'admin'));
```

## 📝 Checklist para Code Review

- [ ] Tabela tem coluna `client_id`?
- [ ] RLS habilitada?
- [ ] Policies usam `get_current_user_client_id()`?
- [ ] Hook usa `useAuth()` para contexto?
- [ ] Sem `client_id` hardcodado?
- [ ] Logs incluem `clientId` e `userId`?
- [ ] Funciona em modo simulação admin?
- [ ] Trigger de auditoria criado (se necessário)?

## 🔗 Arquivos de Referência

- Contexto de auth: `src/contexts/AuthContext.tsx`
- Funções SQL: `supabase/migrations/*_security_definer*.sql`
- Hook exemplo: `src/hooks/useSupabaseSuppliers.ts`
- Logger: `src/utils/systemLogger.ts`

## 📚 Recursos Adicionais

- [Guia de Logging](./LOGGING_GUIDE.md)
- [RLS Policies no Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
