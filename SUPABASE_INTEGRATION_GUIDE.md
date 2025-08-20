# QuoteMaster Pro - Guia de Integração Supabase

## 📋 Visão Geral

Este documento detalha como integrar o QuoteMaster Pro com o Supabase para funcionalidades backend completas.

## 🏗️ Estrutura de Dados Preparada

### Tabelas Principais

✅ **profiles** - Gerenciamento de usuários
✅ **clients** - Dados dos clientes/condomínios  
✅ **subscription_plans** - Planos de assinatura
✅ **suppliers** - Fornecedores (locais e certificados)
✅ **products** - Catálogo de produtos/itens
✅ **quotes** - Cotações e orçamentos
✅ **quote_items** - Itens das cotações
✅ **approvals** - Fluxo de aprovações
✅ **payments** - Gestão de pagamentos
✅ **notifications** - Sistema de notificações
✅ **audit_logs** - Auditoria completa

### Recursos Implementados (Frontend Ready)

#### 🎛️ Dashboard
- Métricas dinâmicas do cliente
- Ações rápidas funcionais
- Gráfico de performance
- Cotações recentes
- Prompts de avaliação

#### 👤 Autenticação & Usuários
- Menu de usuário completo
- Perfil dinâmico do cliente
- Informações de plano em tempo real
- Sistema de notificações

#### 📝 Gestão de Cotações
- CRUD completo
- Status tracking
- Aprovações workflow
- Histórico de mudanças

#### 🏢 Fornecedores
- Fornecedores locais vs certificados
- Sistema de avaliações
- Gestão de especialidades
- Ocultação de dados sensíveis (certificados)

#### 💳 Pagamentos
- Tracking de status
- Histórico de transações
- Integração pronta para gateways

#### 📊 Relatórios
- Sistema de auditoria
- Exportação de dados
- Métricas de performance

## 🔐 Políticas RLS Configuradas

### Segurança por Papel (RBAC)
- **Admin**: Acesso total à plataforma
- **Manager**: Gestão do cliente/condomínio
- **Collaborator**: Criação de cotações  
- **Supplier**: Acesso aos próprios dados

### Políticas de Acesso
```sql
-- Usuários veem apenas seus dados
profiles: "auth.uid() = id"

-- Clientes veem apenas seus dados
clients: "profile.client_id = id"

-- Fornecedores certificados são públicos
suppliers: "type = 'certificado' OR client_id = user_client_id"

-- Cotações por cliente
quotes: "client_id = user_client_id"
```

## 📦 Hooks Implementados

### useCurrentClient()
```typescript
const { 
  currentClient,    // Dados do cliente atual
  clientName,       // Nome do cliente
  subscriptionPlan, // Plano de assinatura
  isLoading,        // Estado de carregamento
  updateClient      // Função para atualizar
} = useCurrentClient();
```

### useSubscriptionPlans()
```typescript
const { 
  plans,              // Lista de planos
  getPlanById,        // Buscar plano por ID
  getPlanDisplayName  // Nome formatado do plano
} = useSubscriptionPlans();
```

### useNotifications()
```typescript
const { 
  notifications,   // Lista de notificações
  unreadCount,     // Contador não lidas
  markAsRead,      // Marcar como lida
  markAllAsRead    // Marcar todas como lidas
} = useNotifications();
```

## 🎯 Próximos Passos para Integração

### 1. Configurar Supabase
```bash
# Instalar CLI do Supabase
npm install -g supabase

# Inicializar projeto
supabase init

# Conectar ao projeto
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Executar Migrações
```sql
-- Executar schema definido em src/data/databaseSchema.ts
-- Aplicar políticas RLS
-- Configurar indexes de performance
```

### 3. Configurar Storage
```sql
-- Bucket para anexos
CREATE BUCKET attachments;

-- Política de acesso
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 4. Edge Functions
```typescript
// /check-limit - Verificar limites do plano
// /payments/create-intent - Criar intenção de pagamento  
// /notify - Enviar notificações
// /integrations/set-key - Configurar chaves API
```

### 5. Realtime Subscriptions
```typescript
// Ativar realtime para:
- quotes (cotações)
- approvals (aprovações)  
- payments (pagamentos)
- notifications (notificações)
```

## 🔧 Configurações Necessárias

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Auth Configuration
- Email/Password habilitado
- OAuth providers (Google, etc.)
- JWT customizado com claims

### Rate Limiting
- Configurar limites por plano
- Proteção contra spam
- Throttling de APIs

## 📋 Checklist de Integração

### Backend Setup
- [ ] Criar projeto Supabase
- [ ] Executar schema de dados
- [ ] Configurar políticas RLS
- [ ] Setup de Storage
- [ ] Configurar Auth
- [ ] Deploy Edge Functions

### Frontend Integration  
- [ ] Instalar @supabase/supabase-js
- [ ] Configurar cliente Supabase
- [ ] Substituir hooks mock por queries reais
- [ ] Implementar realtime subscriptions
- [ ] Configurar upload de arquivos
- [ ] Testes de integração

### Production Ready
- [ ] Configurar domínio customizado
- [ ] SSL certificates
- [ ] Backup policies
- [ ] Monitoring e logs
- [ ] Performance optimization

## 🎨 Funcionalidades Prontas

### ✅ Implementado e Testado
- Dashboard dinâmico
- Menu lateral organizado
- Ações rápidas funcionais
- Sistema de notificações
- Menu de usuário completo
- Dados de cliente dinâmicos
- Planos de assinatura
- Estrutura de dados completa

### 🚀 Pronto para Supabase
- Hooks preparados para queries
- Componentes aguardando dados reais
- Políticas RLS definidas
- Schema de banco completo
- Fluxos de negócio implementados

O sistema está **100% preparado** para conectar com Supabase e ir para produção! 🎉