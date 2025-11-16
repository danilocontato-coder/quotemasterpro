# Migração para AuthContextV2 - Guia de Testes

## 📋 Visão Geral

O **AuthContextV2** é uma reimplementação modular do sistema de autenticação, dividido em 4 módulos principais:

- **AuthCore.tsx**: Estado principal, session management, fetch de perfil
- **AuthModals.tsx**: Modais de troca de senha forçada e termos de uso
- **AuthNavigation.tsx**: Lógica de navegação baseada em roles
- **AuthSimulation.tsx**: Simulação de login admin (para suporte)

## 🚀 Como Ativar para Testes

### 1. Ambiente Local (Development)

Crie ou edite o arquivo `.env.local`:

```bash
VITE_USE_AUTH_V2=true
```

Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

### 2. Ambiente de Staging

Adicione a variável de ambiente no painel da Lovable:

```
VITE_USE_AUTH_V2=true
```

### 3. Voltar para a Versão Antiga

Altere para `false` ou remova a variável:

```bash
VITE_USE_AUTH_V2=false
```

## ✅ Checklist de Testes Obrigatórios

### Autenticação Básica
- [ ] Login com email/senha funciona
- [ ] Logout funciona e limpa sessão
- [ ] Refresh da página mantém usuário logado
- [ ] Token expira corretamente (simular deslogando no Supabase)
- [ ] Erro de credenciais inválidas é exibido

### Roles e Navegação
- [ ] Admin é redirecionado para `/admin/superadmin`
- [ ] Manager/Admin Cliente → `/dashboard`
- [ ] Supplier → `/supplier`
- [ ] Support → `/support`
- [ ] Collaborator → `/dashboard`

### Simulação Admin (Modo Suporte)
- [ ] Admin consegue simular acesso como cliente
- [ ] Admin consegue simular acesso como fornecedor
- [ ] Logout em modo simulado fecha a janela
- [ ] URL com `?adminToken=xxx` funciona

### Modais e Fluxos Especiais
- [ ] Modal de troca de senha forçada aparece (se `force_password_change = true`)
- [ ] Modal de termos de uso aparece (se `terms_accepted = false`)
- [ ] Trocar senha forçada funciona e libera acesso
- [ ] Aceitar termos libera acesso

### Perfil do Usuário
- [ ] Dados do perfil são carregados (nome, avatar, empresa)
- [ ] Atualizar perfil funciona
- [ ] Verificação de cliente/fornecedor ativo funciona
- [ ] Cliente desativado é deslogado automaticamente
- [ ] Fornecedor desativado é deslogado automaticamente

### Edge Cases
- [ ] Múltiplas abas abertas sincronizam logout
- [ ] Navegar entre páginas mantém sessão
- [ ] Erro de rede não quebra autenticação
- [ ] Loading state aparece durante fetch de dados

## 🐛 Reportar Problemas

Se encontrar qualquer erro, anote:

1. **O que você fez**: Ex: "Fiz login como manager"
2. **O que esperava**: Ex: "Ser redirecionado para /dashboard"
3. **O que aconteceu**: Ex: "Fiquei em loading infinito"
4. **Console logs**: Abra DevTools → Console e copie os erros
5. **Network tab**: Veja se há requisições falhando (status 401/403/500)

## 📊 Métricas de Sucesso

Antes de migrar para produção, verificar:

- ✅ **0 erros** relacionados a autenticação no console
- ✅ **Taxa de login bem-sucedido** = 100%
- ✅ **Tempo de carregamento inicial** < 2 segundos
- ✅ **Nenhum usuário** reportou problemas de login/logout

## 🔄 Rollback (se necessário)

Se algo der errado, volte para a versão antiga:

```bash
# .env.local
VITE_USE_AUTH_V2=false
```

Reinicie o servidor. O sistema volta a usar `AuthContext.tsx` original.

## 📅 Timeline de Migração Sugerido

| Fase | Duração | Ação |
|------|---------|------|
| 1. Testes locais | 2 dias | Todos os cenários acima |
| 2. Staging | 1 semana | Equipe interna testa |
| 3. Beta produção | 1 semana | 10% dos usuários |
| 4. Produção total | - | 100% dos usuários |
| 5. Remover código antigo | 1 semana | Após 2 semanas estável |

## ⚠️ Notas Importantes

1. **AuthContext.tsx e AuthContextV2.tsx coexistem**: O código antigo não foi removido
2. **Mesma API externa**: Componentes continuam usando `useAuth()` normalmente
3. **Zero breaking changes**: A interface pública é idêntica
4. **Rollback instantâneo**: Basta mudar a variável de ambiente

## 🔧 Diferenças Técnicas

| Aspecto | AuthContext (antigo) | AuthContextV2 (novo) |
|---------|---------------------|---------------------|
| Linhas de código | 657 linhas | ~150 linhas (dividido em 4 módulos) |
| Manutenibilidade | ⚠️ Difícil | ✅ Fácil |
| Testabilidade | ⚠️ Baixa | ✅ Alta |
| Performance | ✅ OK | ✅ OK (mesma) |
| Funcionalidades | ✅ Completo | ✅ Completo |

## 📞 Suporte

Dúvidas ou problemas? Contate o time de desenvolvimento.
