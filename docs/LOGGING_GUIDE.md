# Guia de Logging do Cotiz

## 📊 Sistema de Logging

O Cotiz usa um sistema de logging centralizado via `systemLogger.ts` que rastreia todas as operações críticas com contexto multi-tenant.

## 🎯 Categorias de Log

### 1. `tenant` - Operações Multi-Tenant (PRINCIPAL)
Usado para rastrear operações com contexto de cliente/fornecedor:

```typescript
import { logger } from '@/utils/systemLogger';

logger.tenant('OPERATION_NAME', {
  clientId: user?.clientId,
  userId: user?.id,
  role: user?.role,
  isAdminMode: user?.id?.startsWith('admin_simulated_')
});
```

**Quando usar:**
- Criação/leitura/atualização/exclusão de dados vinculados a clientes
- Operações que exigem isolamento multi-tenant
- Ações críticas que precisam de auditoria

### 2. `auth` - Autenticação
```typescript
logger.auth('Login successful', { userId, email });
```

### 3. `data` - Operações de dados gerais
```typescript
logger.data('Suppliers fetched', { count: data.length });
```

### 4. `navigation` - Navegação entre páginas
```typescript
logger.navigation('User navigated to quotes', { route: '/quotes' });
```

### 5. `error` - Erros gerais
```typescript
logger.error('category', 'Error message', { details });
```

## 📝 Padrão de Logging em Hooks

### Padrão START → SUCCESS → ERROR

```typescript
export const useMeuHook = () => {
  const { user } = useAuth();
  
  const operation = async () => {
    // ✅ INÍCIO - Sempre logar antes da operação
    logger.tenant('OPERATION_START', {
      clientId: user?.clientId,
      userId: user?.id,
      isAdminMode: user?.id?.startsWith('admin_simulated_')
    });
    
    try {
      const result = await supabase.from('...').insert(...);
      
      // ✅ SUCESSO - Logar resultado
      logger.tenant('OPERATION_SUCCESS', {
        clientId: user?.clientId,
        resultId: result.data?.id,
        count: result.data?.length
      });
      
      return result;
    } catch (error) {
      // ✅ ERRO - Sempre capturar e logar
      logger.tenant('OPERATION_ERROR', {
        clientId: user?.clientId,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error?.code
      });
      
      throw error;
    }
  };
};
```

### Exemplo Completo: Hook de Fornecedores

```typescript
const fetchSuppliers = async () => {
  try {
    setIsLoading(true);
    
    // Log de início
    logger.tenant('FETCH_SUPPLIERS_START', {
      userId: user?.id,
      clientId: profile?.client_id,
      role: user?.role,
      isAdminMode: user?.id?.startsWith('admin_simulated_')
    });
    
    const { data, error } = await supabase
      .rpc('get_client_suppliers', { p_client_id: profile.client_id });
    
    if (error) throw error;
    
    // Log de sucesso
    logger.tenant('FETCH_SUPPLIERS_SUCCESS', {
      clientId: profile?.client_id,
      count: data?.length || 0,
      method: 'RPC'
    });
    
    setSuppliers(data);
  } catch (error) {
    // Log de erro
    logger.tenant('FETCH_SUPPLIERS_ERROR', {
      clientId: profile?.client_id,
      error: error instanceof Error ? error.message : String(error)
    });
    
    toast.error('Erro ao carregar fornecedores');
  }
};
```

## 🔍 Inspecionar Logs no Console

### Durante desenvolvimento

O logger fica disponível globalmente no `window`:

```javascript
// Ver todos os logs
__SYSTEM_LOGGER__.getLogs();

// Ver logs de uma categoria específica
__SYSTEM_LOGGER__.getLogs('tenant');

// Exportar logs para análise
const logsJSON = __SYSTEM_LOGGER__.exportLogs();
console.log(logsJSON);

// Detectar problemas automaticamente
const issues = __SYSTEM_LOGGER__.detectIssues();
console.log('Problemas detectados:', issues);
// { refreshes: 0, errors: 2, slowOperations: 1 }

// Habilitar/desabilitar categorias
__SYSTEM_LOGGER__.enableAll();
__SYSTEM_LOGGER__.disable('tenant');
__SYSTEM_LOGGER__.enable('auth');

// Limpar logs
__SYSTEM_LOGGER__.clearLogs();
```

### Filtrar logs por cliente

```javascript
// Filtrar logs de um cliente específico
const clientLogs = __SYSTEM_LOGGER__.getLogs('tenant')
  .filter(log => log.data?.clientId === 'uuid-do-cliente');

console.table(clientLogs);
```

## 📊 Logs de Banco de Dados (tenant_access_logs)

Além dos logs do frontend, o banco registra automaticamente acessos via triggers RLS:

```sql
-- Ver logs de acesso de um cliente
SELECT 
  user_id,
  client_id,
  action,
  table_name,
  allowed,
  reason,
  created_at
FROM public.tenant_access_logs
WHERE client_id = 'uuid-do-cliente'
ORDER BY created_at DESC
LIMIT 100;

-- Ver tentativas negadas (violações de RLS)
SELECT * FROM public.tenant_access_logs
WHERE allowed = false
ORDER BY created_at DESC;

-- Ver logs de uma tabela específica
SELECT * FROM public.tenant_access_logs
WHERE table_name = 'quotes'
ORDER BY created_at DESC
LIMIT 50;
```

## 🛠️ Boas Práticas

### ✅ O que fazer

1. **Sempre logar operações críticas**
   - Criação/atualização/exclusão de dados
   - Mudanças de status importantes
   - Operações que afetam múltiplos registros

2. **Incluir contexto relevante**
   ```typescript
   logger.tenant('DELETE_QUOTE', {
     clientId: user?.clientId,
     quoteId: id,
     quoteName: quote.title,
     status: quote.status,
     itemsCount: quote.items_count
   });
   ```

3. **Usar nomes descritivos**
   - ✅ `CREATE_SUPPLIER_START`
   - ❌ `operation1`

4. **Capturar erros completos**
   ```typescript
   catch (error) {
     logger.tenant('ERROR', {
       error: error instanceof Error ? error.message : String(error),
       errorCode: error?.code,
       stack: error?.stack // Em dev apenas
     });
   }
   ```

### ❌ O que evitar

1. **Logar dados sensíveis**
   ```typescript
   // ❌ NUNCA logar senhas, tokens, etc
   logger.tenant('LOGIN', { password: '...' }); // ERRADO
   
   // ✅ Logar apenas metadados
   logger.tenant('LOGIN', { userId, email }); // CORRETO
   ```

2. **Logs excessivos em loops**
   ```typescript
   // ❌ EVITAR logs dentro de loops
   data.forEach(item => {
     logger.tenant('PROCESSING', { item }); // Vai criar centenas de logs
   });
   
   // ✅ Logar resumo
   logger.tenant('PROCESSING_BATCH', { 
     totalItems: data.length,
     processedAt: new Date()
   });
   ```

3. **Ignorar erros silenciosamente**
   ```typescript
   // ❌ NUNCA fazer catch vazio
   try {
     await operation();
   } catch (error) {
     // Nada aqui = problema invisível
   }
   
   // ✅ Sempre logar e re-lançar se necessário
   try {
     await operation();
   } catch (error) {
     logger.tenant('ERROR', { error });
     throw error;
   }
   ```

## 📈 Análise de Performance

O logger detecta automaticamente operações lentas:

```typescript
import { measure } from '@/utils/systemLogger';

const operation = async () => {
  const done = measure('FETCH_LARGE_DATASET', 'performance');
  
  await fetchData(); // Operação lenta
  
  done(); // Loga automaticamente se > 1000ms
};
```

## 🔗 Recursos Relacionados

- [Guia Multi-Tenant](./MULTI_TENANT_GUIDE.md)
- [SystemLogger.ts](../src/utils/systemLogger.ts)
- [AuthContext.tsx](../src/contexts/AuthContext.tsx)
