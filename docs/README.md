# Documentação Técnica do Cotiz

## 📚 Guias Disponíveis

### 🔐 Segurança e Isolamento
1. **[Guia Multi-Tenant](./MULTI_TENANT_GUIDE.md)** - Arquitetura e padrões de isolamento de dados por cliente

### 📊 Monitoramento
2. **[Guia de Logging](./LOGGING_GUIDE.md)** - Sistema de logging e rastreabilidade de operações

### 🚧 Em Desenvolvimento
3. **Guia de RLS** - Row-Level Security no Supabase (em breve)
4. **Guia de Edge Functions** - Funções serverless (em breve)
5. **Guia de Testes** - Estratégias de teste e isolamento (em breve)

## 🚀 Quick Start para Novos Desenvolvedores

### 1. Entender Multi-Tenant
**Leia primeiro:** [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md)

Conceitos essenciais:
- Isolamento de dados por `client_id`
- RLS (Row-Level Security) policies
- Funções SQL seguras (`SECURITY DEFINER`)
- Admin simulation (visualizar como cliente)

### 2. Configurar logging
```typescript
import { logger } from '@/utils/systemLogger';

// Habilitar todos os logs no console (dev)
logger.enableAll();

// Logar operações multi-tenant
logger.tenant('MINHA_OPERACAO', {
  clientId: user?.clientId,
  userId: user?.id
});

// Ver logs acumulados
console.log(__SYSTEM_LOGGER__.getLogs('tenant'));
```

### 3. Testar isolamento
1. Fazer login como Admin no painel `/admin/superadmin`
2. Ir para `/admin/clients`
3. Clicar em "Ver como cliente" para simular acesso
4. Verificar que dados estão isolados por cliente

### 4. Criar nova feature com isolamento

**Passo a passo:**

1. **Criar tabela com RLS:**
```sql
CREATE TABLE public.minha_feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.minha_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY minha_feature_select ON public.minha_feature
FOR SELECT
USING (client_id = get_current_user_client_id());
```

2. **Criar hook com logging:**
```typescript
export const useMinhaFeature = () => {
  const { user } = useAuth();
  
  const fetch = async () => {
    logger.tenant('FETCH_START', { clientId: user?.clientId });
    
    try {
      const { data, error } = await supabase
        .from('minha_feature')
        .select('*');
      
      if (error) throw error;
      
      logger.tenant('FETCH_SUCCESS', { 
        clientId: user?.clientId, 
        count: data.length 
      });
      
      return data;
    } catch (error) {
      logger.tenant('FETCH_ERROR', { 
        clientId: user?.clientId, 
        error: error.message 
      });
      throw error;
    }
  };
  
  return { fetch };
};
```

3. **Testar isolamento:**
- Login como admin
- Simular cliente A → verificar dados
- Simular cliente B → verificar dados diferentes
- Verificar logs: `__SYSTEM_LOGGER__.getLogs('tenant')`

## 📝 Padrões de Código

### Estrutura de Hooks
```
src/hooks/
  ├── useMinhaFeature.ts        # Hook principal
  ├── useSupabaseMinhaFeature.ts # Integração Supabase
  └── useOptimizedCache.ts      # Cache (se necessário)
```

### Estrutura de Componentes
```
src/components/
  ├── minha-feature/
  │   ├── MinhaFeatureList.tsx
  │   ├── MinhaFeatureForm.tsx
  │   └── MinhaFeatureDetail.tsx
  └── ui/                       # Componentes reutilizáveis
```

### Nomenclatura de Logs
- **START**: Início de operação
- **SUCCESS**: Operação concluída com sucesso
- **ERROR**: Erro durante operação
- **VALIDATION_ERROR**: Erro de validação
- **RLS_DENIED**: Acesso negado por RLS

Exemplo:
```typescript
logger.tenant('CREATE_QUOTE_START', { ... });
logger.tenant('CREATE_QUOTE_SUCCESS', { ... });
logger.tenant('CREATE_QUOTE_ERROR', { ... });
```

## 🔍 Debugging

### Ver logs do frontend
```javascript
// Console do navegador
__SYSTEM_LOGGER__.getLogs();
__SYSTEM_LOGGER__.exportLogs(); // JSON completo
```

### Ver logs do banco
```sql
-- Últimas operações
SELECT * FROM public.tenant_access_logs
ORDER BY created_at DESC
LIMIT 100;

-- Logs de um cliente específico
SELECT * FROM public.tenant_access_logs
WHERE client_id = 'uuid-do-cliente'
ORDER BY created_at DESC;
```

### Ver logs do Supabase
1. Acessar painel Supabase
2. Logs → Real-time
3. Filtrar por tabela/operação

## 🛠️ Ferramentas Úteis

### VS Code Extensions Recomendadas
- **Postgres** - Gerenciamento de banco
- **ESLint** - Linting de código
- **Prettier** - Formatação de código
- **Thunder Client** - Testar Edge Functions

### Scripts Úteis
```bash
# Rodar migrations localmente
npm run db:migrate

# Resetar banco local (dev)
npm run db:reset

# Ver logs do Supabase
npm run logs:supabase

# Gerar tipos do Supabase
npm run types:generate
```

## 📚 Recursos Externos

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contribuindo

### Antes de commitar
1. [ ] Código segue padrão multi-tenant
2. [ ] RLS policies criadas/atualizadas
3. [ ] Logs adicionados em operações críticas
4. [ ] Testado em modo simulação admin
5. [ ] Documentação atualizada (se necessário)

### Code Review Checklist
- [ ] Sem `client_id` hardcodado
- [ ] Usa `get_current_user_client_id()` em policies
- [ ] Logs incluem contexto (clientId, userId)
- [ ] Funciona em simulação admin
- [ ] Sem dados sensíveis em logs

## 📞 Suporte

Em caso de dúvidas sobre padrões de código ou arquitetura:
1. Consulte os guias nesta documentação
2. Verifique exemplos em hooks existentes
3. Entre em contato com a equipe técnica

---

**Última atualização:** 2025-01-20  
**Versão:** 1.0
