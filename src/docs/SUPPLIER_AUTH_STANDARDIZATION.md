# Padronização: Autenticação de Fornecedores

Data: 2025-09-05
Status: Aplicado

## Resumo
Padronizou-se a autenticação de fornecedores para seguir os mesmos padrões das correções aplicadas na criação de cotações, garantindo consistência global na aplicação.

## Problemas identificados
1. **Onboarding incompleto**: Fornecedores cadastrados mas com `onboarding_completed = false`
2. **Falta de auto-correção**: Não havia verificação automática para completar onboarding de contas já vinculadas
3. **Inconsistência com padrões**: Módulo de fornecedores não seguia os mesmos padrões de verificação aplicados nas cotações

## Correções aplicadas

### 1. Hook dedicado para fornecedores (`useAuthSupplier.ts`)
- Criado hook específico seguindo padrão do `useAuthTenant`
- Auto-completar onboarding para fornecedores já vinculados
- Verificação consistente de estado de vinculação
- Função `linkToSupplier` para vinculação padronizada

### 2. Atualização do registro de fornecedores (`SupplierAuth.tsx`)
```typescript
// No registro, marcar onboarding como completo
const { error: profileError } = await supabase
  .from('profiles')
  .update({ 
    supplier_id: supplier.id, 
    role: 'supplier',
    onboarding_completed: true,      // ← Adicionado
    updated_at: new Date().toISOString()  // ← Adicionado
  })
  .eq('id', authData.user.id);
```

### 3. Auto-correção no login de fornecedores
```typescript
// Auto-completar onboarding se fornecedor já vinculado mas onboarding incompleto
if (profile?.supplier_id && !profile?.onboarding_completed) {
  console.log('🔧 Auto-completando onboarding para fornecedor já vinculado');
  await supabase
    .from('profiles')
    .update({ 
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.user.id);
}
```

## Benefícios
- **Consistência global**: Fornecedores e clientes seguem os mesmos padrões
- **Correção automática**: Contas já cadastradas são auto-corrigidas no próximo login
- **Prevenção**: Novos cadastros já seguem o padrão correto
- **Manutenibilidade**: Código padronizado facilita futuras alterações

## Arquivos alterados
- `src/hooks/useAuthSupplier.ts` (novo)
- `src/pages/supplier/SupplierAuth.tsx`
- `src/docs/SUPPLIER_AUTH_STANDARDIZATION.md` (nova documentação)

## Como validar
1. **Fornecedor novo**: Cadastrar via link → verificar `onboarding_completed = true`
2. **Fornecedor existente**: Login → verificar auto-correção se necessário
3. **Consistência**: Verificar que padrões seguem `QUOTES_CREATION_FIX.md`

## Integração futura
Este padrão deve ser mantido em:
- Novos módulos de autenticação
- Atualizações de vinculação usuário-entidade
- Correções de onboarding incompleto