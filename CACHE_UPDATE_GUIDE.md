# 📚 Guia de Atualização e Cache - Cotiz

## 🎯 Visão Geral

Este documento descreve o sistema de cache implementado no Cotiz e como gerenciar atualizações para garantir que os usuários sempre vejam a versão mais recente da aplicação.

## 🔄 Sistema de Cache - 4 Camadas

### 1. **Service Worker (PWA)**
- **Estratégia:** `NetworkFirst` para assets críticos (JS, CSS, HTML)
- **Função:** Tenta buscar da rede primeiro, usa cache como fallback
- **Atualização:** Automática a cada 1 hora
- **Notificação:** Toast automático quando nova versão está disponível

### 2. **React Query**
- **staleTime:** 2 minutos (dados considerados frescos)
- **gcTime:** 5 minutos (garbage collection)
- **Revalidação:** Automática ao focar janela
- **Refetch:** Sempre ao montar componentes

### 3. **SessionStorage Cache**
- **TTL:** 5 minutos para planos, 30 segundos para uso
- **Validação:** Por versão da aplicação (`VITE_APP_VERSION`)
- **Invalidação:** Automática quando versão muda

### 4. **Version Checker**
- **Frequência:** Checa `/version.json` a cada 5 minutos
- **Detecção:** Compara versão local com servidor
- **Notificação:** Toast com botão "Recarregar"

## 📝 Como Fazer Deploy de Nova Versão

### Passo 1: Incrementar Versão
Antes de fazer deploy, atualize a versão em **2 lugares**:

**1. `.env`**
```env
VITE_APP_VERSION="1.0.2"  # Incrementar aqui
```

**2. `public/version.json`**
```json
{
  "version": "1.0.2",
  "releaseDate": "2025-10-23",
  "description": "Descrição das mudanças"
}
```

### Passo 2: Fazer Deploy
```bash
# Fazer commit das mudanças
git add .
git commit -m "chore: bump version to 1.0.2"

# Deploy (exemplo com Lovable)
git push origin main
```

### Passo 3: Verificar Atualização
Após o deploy:
1. Abra a aplicação em um navegador onde já estava aberta
2. Aguarde até 5 minutos (ou force com F5)
3. Você verá um toast: "Nova versão disponível! 🚀"
4. Clique em "Recarregar" para atualizar

## 🧪 Como Testar o Sistema de Cache

### Teste 1: Service Worker Update
```bash
# 1. Abra a aplicação
# 2. Abra DevTools > Application > Service Workers
# 3. Clique em "Update" manualmente
# 4. Verifique se o toast aparece
```

### Teste 2: Version Checker
```bash
# 1. Abra a aplicação
# 2. Mude o version.json no servidor para uma versão diferente
# 3. Aguarde até 5 minutos (ou recarregue)
# 4. Verifique se o toast de nova versão aparece
```

### Teste 3: Cache Invalidation
```bash
# 1. Abra Console do navegador
# 2. Execute: localStorage.getItem('app_version')
# 3. Mude VITE_APP_VERSION no .env
# 4. Faça rebuild e reload
# 5. Verifique se caches do sessionStorage foram limpos
```

## 🛠️ Ferramentas de Debug

### SuperAdmin Dashboard
No painel de SuperAdmin, há um botão "Limpar Todo o Cache e Recarregar" que:
- Limpa sessionStorage e localStorage
- Remove todos os Service Workers
- Deleta cache do navegador
- Recarrega a aplicação automaticamente

**Quando usar:**
- Problemas persistentes de cache
- Após deploy de mudanças críticas
- Teste de versão limpa

### Console Logs
O sistema registra logs úteis:
```javascript
// Service Worker
✅ Service Worker registrado com sucesso
🔄 Checando atualizações do Service Worker...
🆕 Nova versão detectada! Instalando...

// Version Checker
✅ Versão atual: 1.0.1
🆕 Nova versão detectada: { current: '1.0.1', new: '1.0.2' }

// Cache
📊 [SubscriptionContext] Uso calculado: {...}
```

## 🚨 Troubleshooting

### Problema: Usuários não veem mudanças após deploy

**Solução 1: Verificar versões**
```bash
# Certifique-se de que atualizou:
# - .env (VITE_APP_VERSION)
# - public/version.json
```

**Solução 2: Forçar limpeza de cache**
```bash
# Instrua usuários a fazer:
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)

# Ou use o botão no SuperAdmin Dashboard
```

**Solução 3: Verificar headers**
```bash
# Verifique se public/_headers está correto:
curl -I https://seusite.com/index.html
# Deve retornar: Cache-Control: no-cache, no-store, must-revalidate
```

### Problema: Service Worker não atualiza

**Diagnóstico:**
1. Abra DevTools > Application > Service Workers
2. Verifique se há múltiplos workers registrados
3. Clique em "Unregister" em todos
4. Recarregue a página

**Prevenção:**
- O sistema agora usa `clientsClaim: true` e `skipWaiting: true`
- Service Worker atualiza automaticamente a cada 1 hora

### Problema: Cache sessionStorage não invalida

**Diagnóstico:**
```javascript
// No console:
sessionStorage.getItem('subscription_plans_version')
// Deve coincidir com VITE_APP_VERSION
```

**Solução:**
- Incrementar `VITE_APP_VERSION` no `.env`
- Fazer rebuild da aplicação
- Cache será invalidado automaticamente

## 📊 Métricas de Sucesso

Para saber se o sistema está funcionando bem:

1. **Taxa de Atualização:** % de usuários que veem notificação dentro de 5 min
2. **Cache Hit Rate:** % de requests servidos do cache vs rede
3. **Tempo de Load:** Medir First Contentful Paint (FCP)
4. **Erros de Cache:** Monitorar logs de erro relacionados a cache

## 🎓 Boas Práticas

### ✅ FAZER
- Sempre incrementar versão antes de deploy importante
- Testar localmente antes de produção
- Documentar mudanças no `description` do version.json
- Usar formato semântico: `MAJOR.MINOR.PATCH`

### ❌ NÃO FAZER
- Não pular incremento de versão
- Não fazer deploy sem atualizar version.json
- Não usar cache agressivo (> 10 min) para dados críticos
- Não esquecer de testar em diferentes navegadores

## 🔗 Links Úteis

- **Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Cache API:** https://developer.mozilla.org/en-US/docs/Web/API/Cache
- **PWA Best Practices:** https://web.dev/progressive-web-apps/
- **React Query Caching:** https://tanstack.com/query/latest/docs/react/guides/caching

## 📞 Suporte

Se encontrar problemas não documentados aqui:
1. Verifique logs do console
2. Use o botão "Limpar Cache" no SuperAdmin
3. Documente o problema e abra um ticket

---

**Última Atualização:** 2025-10-23  
**Versão do Sistema:** 1.0.1
