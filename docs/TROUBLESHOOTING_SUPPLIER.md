# Guia de Troubleshooting - Módulo Fornecedor

## Problemas Comuns e Soluções

### 🚨 Dashboard não carrega ou mostra dados zerados

#### Causa 1: Cache do Navegador
**Sintomas:**
- Dashboard vazio ou carregando infinitamente
- Dados antigos sendo exibidos
- Componentes não atualizando

**Solução:**
1. **Windows/Linux:** Pressione `Ctrl + Shift + R` ou `Ctrl + F5`
2. **Mac:** Pressione `Cmd + Shift + R`
3. **Alternativa:** Abra o navegador em modo anônimo/privado:
   - Chrome: `Ctrl/Cmd + Shift + N`
   - Firefox: `Ctrl/Cmd + Shift + P`
   - Safari: `Cmd + Shift + N`

#### Causa 2: Sessão Expirada
**Sintomas:**
- Erros 401 (Unauthorized) no console
- Redirecionamento para login
- Dados não carregam mesmo após refresh

**Solução:**
1. Abra o Console do navegador (F12)
2. Vá para a aba "Application" ou "Armazenamento"
3. Limpe todo o localStorage e sessionStorage
4. Faça logout completo
5. Faça login novamente

#### Causa 3: Problemas de Permissão RLS
**Sintomas:**
- Erro "row violates row-level security"
- Erro "infinite recursion detected in policy"
- Dados parciais carregando

**Solução:**
1. Abra o Console (F12)
2. Procure por logs começando com:
   - `🔍 [SUPPLIER-DASHBOARD]`
   - `🎯 CRÍTICO:`
   - `❌ [ERROR]`
3. Copie os logs e compartilhe com o suporte
4. Verifique se seu `supplier_id` está correto no perfil

### 🔢 Cotações mostrando número grande ao invés de RFQ

#### Causa: Cotação sem código local
**Sintomas:**
- Exibe UUID longo (ex: `a1b2c3d4-e5f6-7890-...`)
- Ao invés de código formatado (ex: `RFQ14`)

**Solução:**
1. Verifique no banco de dados se a cotação tem `local_code` preenchido
2. Se não tiver, é uma cotação criada antes da implementação do sistema de códigos
3. Edite a cotação e salve novamente para gerar o código automaticamente

### 💰 Cotações com valores zerados

#### Causa: Cotações sem itens calculados
**Sintomas:**
- Total da cotação mostra R$ 0,00
- Status `draft` ou `sent`

**Solução:**
**ISSO NÃO É UM BUG!** Cotações podem ter valor zero se:
1. Estão em rascunho e ainda não foram preenchidas
2. Foram enviadas mas sem itens adicionados
3. Os itens não tiveram preço calculado

**Para corrigir:**
1. Abra a cotação
2. Adicione itens com quantidade e preço
3. Salve a cotação
4. O total será recalculado automaticamente

## 🔍 Como Identificar a Causa do Problema

### 1. Verificar Console do Navegador
```
F12 → Console Tab
```

Procure por:
- ❌ Mensagens em vermelho (erros)
- ⚠️ Mensagens em amarelo (warnings)
- Logs começando com emojis: 🔍 🎯 ❌ ✅

### 2. Verificar Network Tab
```
F12 → Network Tab → Filtrar por "supabase"
```

Procure por:
- Status 401 (não autorizado)
- Status 403 (sem permissão)
- Status 500 (erro no servidor)
- Requisições com tempo > 5s (timeout)

### 3. Verificar Application/Storage
```
F12 → Application Tab
```

Verifique:
- localStorage → `supabase.auth.token` deve existir
- sessionStorage → não deve ter erros
- Cookies → domínio supabase deve estar presente

## 🛠️ Ferramentas de Debug Incluídas

### Debug Panel (Apenas Dev)
Se você é desenvolvedor, pode ativar o painel de debug:
1. Vá para `/supplier/dashboard`
2. Procure pelo painel laranja "Debug do Módulo Fornecedor"
3. Verifique informações do seu perfil e fornecedor
4. Use as ações de correção se necessário

### Logs Automáticos
O sistema já inclui logs detalhados:
- `🔍 [SUPPLIER-DASHBOARD]` - Inicialização e fetching de dados
- `🎯 CRÍTICO:` - Operações críticas de busca
- `❌ [ERROR]` - Erros capturados
- `✅ [SUCCESS]` - Operações bem-sucedidas

## 📞 Quando Pedir Suporte

Se após seguir todos os passos acima o problema persistir:

1. **Colete as seguintes informações:**
   - Screenshot do erro (se visível na tela)
   - Console logs completos (F12 → Console → Copy all)
   - Network logs de requisições falhando (F12 → Network → Export HAR)
   - Seu ID de usuário e email
   - Hora exata que o problema ocorreu

2. **Compartilhe com o suporte técnico**

3. **Informações úteis a incluir:**
   - Navegador e versão (ex: Chrome 120, Firefox 115)
   - Sistema operacional (Windows 11, macOS, Linux)
   - Passos exatos para reproduzir o problema
   - O que você esperava que acontecesse vs o que aconteceu

## 🔄 Checklist Rápido de Troubleshooting

- [ ] Limpei o cache do navegador (Ctrl+Shift+R)
- [ ] Fiz logout e login novamente
- [ ] Testei em modo anônimo
- [ ] Verifiquei o Console (F12) por erros
- [ ] Verifiquei a aba Network por requisições falhando
- [ ] Verifiquei se meu usuário tem supplier_id configurado
- [ ] Testei em outro navegador
- [ ] Coletei logs e screenshots para o suporte

---

**Última atualização:** 2025-11-24  
**Versão:** 1.0
