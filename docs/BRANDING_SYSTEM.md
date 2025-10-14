# Sistema de Branding - Documentação Técnica

## ⚠️ ATENÇÃO: NÃO MODIFICAR SEM AUTORIZAÇÃO

Este documento descreve o funcionamento do sistema de branding da plataforma Cotiz. Qualquer alteração neste sistema pode causar problemas graves de UX e perda de configurações personalizadas dos clientes.

---

## 📋 Resumo do Funcionamento

O sistema de branding permite que administradores personalizem:
- Nome da empresa
- Logomarca
- Favicon
- Cores (primária, secundária, accent)
- Textos personalizados (rodapé, login, dashboard)
- CSS customizado

---

## 🏗️ Arquitetura

### Componentes Principais

1. **BrandingContext** (`src/contexts/BrandingContext.tsx`)
   - Gerencia estado global de branding
   - Carrega configurações do banco de dados
   - Aplica branding no DOM

2. **Banco de Dados** (`system_settings`)
   - Armazena configurações globais
   - Tabela: `public.system_settings`
   - Chaves: `platform_name`, `logo_url`, `favicon_url`, `primary_color`, etc.

3. **Componentes de UI**
   - `BrandedHeader`: Cabeçalho com logo
   - `BrandedFooter`: Rodapé personalizado
   - `BrandedLogo`: Componente de logo reutilizável
   - `FaviconUpdater`: Atualiza favicon dinamicamente

---

## ⚡ Fluxo de Carregamento (CRÍTICO)

### ❌ ERRADO (versão antiga que causava problemas):

```typescript
// NÃO FAZER ISSO:
useEffect(() => {
  applyBrandingToDOM(defaultSettings); // ❌ Aplicava padrão ANTES
  loadSettings(); // Depois carregava do banco
}, []);
```

**Problema**: Causava "flash" da logo padrão antes de carregar a logo real do banco.

### ✅ CORRETO (versão atual):

```typescript
useEffect(() => {
  localStorage.removeItem('quoteMaster_branding_cache');
  
  // Carregar APENAS do banco (sem forçar padrão)
  loadSettings().then(() => {
    console.log('✅ Branding carregado');
  }).catch((error) => {
    console.error('❌ Erro ao carregar');
    applyBrandingToDOM(defaultSettings); // Fallback SOMENTE em caso de erro
  });
}, []);
```

**Benefício**: Logo configurada aparece imediatamente, sem flash.

---

## 🛡️ Regras de Proteção (NÃO QUEBRAR)

### 1️⃣ **defaultSettings DEVE ser vazio**

```typescript
// ✅ CORRETO
const defaultSettings: BrandingSettings = {
  companyName: '',
  logo: '',
  primaryColor: '#003366',
  secondaryColor: '#F5F5F5',
  accentColor: '#0066CC',
  favicon: '',
  footerText: '',
  // ...
};
```

**Por quê?**: Se `defaultSettings` tiver valores como "Cotiz" hardcoded, eles podem "vazar" para a UI antes do carregamento do banco.

### 2️⃣ **NUNCA aplicar defaultSettings na inicialização**

```typescript
// ❌ PROIBIDO
useEffect(() => {
  applyBrandingToDOM(defaultSettings); // NÃO FAZER!
  loadSettings();
}, []);

// ✅ PERMITIDO
useEffect(() => {
  loadSettings().catch(() => {
    applyBrandingToDOM(defaultSettings); // OK: só como fallback de erro
  });
}, []);
```

### 3️⃣ **Cache do localStorage DESABILITADO**

```typescript
// ❌ NÃO reabilitar cache automático
// localStorage.removeItem('quoteMaster_branding_cache'); // Manter desabilitado
```

**Por quê?**: Cache pode ficar desatualizado e mostrar logo antiga.

### 4️⃣ **loadSettings SEMPRE busca do banco primeiro**

```typescript
// ✅ Ordem correta de prioridade
const loadSettings = async () => {
  // 1. Tentar carregar configurações globais do banco
  const globalSettings = await loadGlobalSettings();
  
  if (globalSettings) {
    // 2. Aplicar configurações do banco
    applyBrandingToDOM(globalSettings);
  } else {
    // 3. APENAS se falhar, usar padrão vazio
    console.warn('⚠️ Nenhuma configuração no banco');
  }
};
```

---

## 🔧 Como Adicionar Novas Configurações

Se precisar adicionar um novo campo de branding (ex: `loginBackgroundColor`):

### Passo 1: Atualizar interface

```typescript
// src/contexts/BrandingContext.tsx
export interface BrandingSettings {
  companyName: string;
  logo: string;
  // ...
  loginBackgroundColor: string; // ← NOVO CAMPO
}
```

### Passo 2: Adicionar ao defaultSettings (VAZIO)

```typescript
const defaultSettings: BrandingSettings = {
  companyName: '',
  logo: '',
  // ...
  loginBackgroundColor: '', // ← Deixar vazio
};
```

### Passo 3: Adicionar ao banco de dados

```sql
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'login_background_color',
  '"#F5F5F5"',
  'Cor de fundo da página de login'
);
```

### Passo 4: Atualizar loadGlobalSettings

```typescript
// src/contexts/BrandingContext.tsx (linha ~200)
const getValue = (key: string, fallback: string) => {
  const setting = data?.find(s => s.setting_key === key);
  return setting?.setting_value?.replace(/"/g, '') || fallback;
};

return {
  companyName: getValue('platform_name', ''),
  logo: getValue('logo_url', ''),
  // ...
  loginBackgroundColor: getValue('login_background_color', ''), // ← NOVO
};
```

### Passo 5: Aplicar no DOM

```typescript
// src/contexts/BrandingContext.tsx (applyBrandingToDOM)
const applyBrandingToDOM = (brandingSettings: BrandingSettings) => {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brandingSettings.primaryColor);
  // ...
  root.style.setProperty('--login-bg', brandingSettings.loginBackgroundColor); // ← NOVO
};
```

---

## 🧪 Como Testar Alterações

### Teste 1: Carregamento Inicial
1. Limpar `localStorage`
2. Recarregar página
3. **Verificar**: Logo configurada aparece SEM flash da logo padrão

### Teste 2: Alteração de Configurações
1. Ir em `/admin/branding`
2. Alterar logo/favicon
3. Salvar
4. **Verificar**: Mudança aplicada imediatamente (sem cache antigo)

### Teste 3: Erro de Banco
1. Desconectar Supabase temporariamente
2. Recarregar página
3. **Verificar**: Fallback para `defaultSettings` vazio (sem mostrar "Cotiz")

---

## 📊 Monitoramento e Logs

### Logs Importantes

```typescript
console.log('🎨 [BRANDING] Carregando configurações do banco...');
// ↑ Indica início do carregamento

console.log('✅ [BRANDING] Configurações globais encontradas:', globalSettings);
// ↑ Confirma que encontrou no banco

console.warn('⚠️ [BRANDING] Nenhuma configuração global encontrada!');
// ↑ ALERTA: Banco vazio ou problema de RLS

console.error('❌ [BRANDING] Erro ao carregar, usando padrão como fallback:', error);
// ↑ ERRO: Falha ao buscar do banco
```

### Como Interpretar

| Log | Significado | Ação |
|-----|------------|------|
| "Configurações globais encontradas" | ✅ Tudo OK | Nenhuma |
| "Nenhuma configuração global encontrada" | ⚠️ Banco vazio | Verificar `system_settings` |
| "Erro ao carregar" | ❌ Falha crítica | Verificar conexão Supabase/RLS |

---

## 🚨 Problemas Comuns e Soluções

### Problema 1: Logo "pisca" ao carregar
**Causa**: `applyBrandingToDOM(defaultSettings)` sendo chamado antes de `loadSettings()`  
**Solução**: Remover aplicação forçada de `defaultSettings` (ver seção "Fluxo de Carregamento")

### Problema 2: Logo antiga não atualiza
**Causa**: Cache do `localStorage` ativo  
**Solução**: Manter `localStorage.removeItem('quoteMaster_branding_cache')` no `useEffect`

### Problema 3: Aparece "Cotiz" hardcoded
**Causa**: `defaultSettings` com valores preenchidos  
**Solução**: Garantir que `defaultSettings.companyName = ''` (vazio)

### Problema 4: Logo não carrega em produção
**Causa**: Políticas RLS bloqueando `system_settings`  
**Solução**: Verificar policy `system_settings_admin_only` (deve permitir leitura pública ou autenticada)

---

## 📝 Checklist de Manutenção

Antes de fazer qualquer alteração no sistema de branding, verifique:

- [ ] `defaultSettings` está com valores vazios (`''`) para campos de texto?
- [ ] `useEffect` inicial NÃO aplica `defaultSettings` antes de `loadSettings()`?
- [ ] `localStorage` cache está desabilitado?
- [ ] Logs de debug estão presentes?
- [ ] Fallback para `defaultSettings` está APENAS no `.catch()` de erro?
- [ ] Testou em modo incógnito (sem cache)?
- [ ] Testou com banco vazio?
- [ ] Testou com conexão Supabase lenta?

---

## 🔗 Arquivos Relacionados

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/contexts/BrandingContext.tsx` | Gerenciamento de estado e lógica de carregamento |
| `src/components/common/FaviconUpdater.tsx` | Atualização dinâmica do favicon |
| `src/components/branding/BrandedLogo.tsx` | Componente de logo |
| `src/components/branding/BrandingLoader.tsx` | Loader durante carregamento |
| `src/pages/BrandingSettings.tsx` | Interface de configuração (admin) |

---

## 📞 Contato para Dúvidas

Se precisar alterar o sistema de branding:
1. Leia TODA esta documentação
2. Teste localmente com os 3 cenários de teste
3. Documente suas alterações neste arquivo
4. Notifique a equipe antes de deploy

---

**Última Atualização**: 2025-10-14  
**Versão do Sistema**: 1.0 (Estável)  
**Status**: ✅ Funcional e Otimizado
