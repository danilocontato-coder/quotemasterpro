# Exemplo de Integração: Formulário de Fornecedor

## Componente CNPJExistenceChecker

Este componente fornece feedback visual em tempo real sobre a existência de um fornecedor com o CNPJ digitado.

---

## Como Integrar

### 1. Importar o componente

```typescript
import { CNPJExistenceChecker } from '@/components/suppliers/forms/CNPJExistenceChecker';
```

### 2. Adicionar estado para controlar fornecedor existente

```typescript
const [existingSupplierId, setExistingSupplierId] = useState<string | null>(null);
const [existingSupplierName, setExistingSupplierName] = useState<string | null>(null);
```

### 3. Adicionar o componente no formulário

```tsx
<div className="space-y-2">
  <Label htmlFor="cnpj">CNPJ *</Label>
  <Input
    id="cnpj"
    value={formData.cnpj}
    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
    placeholder="00.000.000/0000-00"
    maxLength={18}
  />
  
  {/* Feedback visual de verificação */}
  <CNPJExistenceChecker
    cnpj={formData.cnpj}
    onSupplierFound={(id, name) => {
      setExistingSupplierId(id);
      setExistingSupplierName(name);
      console.log('Fornecedor existente encontrado:', { id, name });
    }}
  />
  
  {errors.cnpj && (
    <p className="text-sm text-destructive">{errors.cnpj}</p>
  )}
</div>
```

### 4. Ajustar lógica de submissão

```typescript
const handleSubmit = async () => {
  if (existingSupplierId) {
    console.log('Vinculando fornecedor existente:', existingSupplierId);
    
    // Criar apenas a associação
    const { error } = await supabase
      .from('client_suppliers')
      .upsert({
        client_id: currentClientId,
        supplier_id: existingSupplierId,
        status: 'active',
        associated_at: new Date().toISOString()
      });
    
    if (error) {
      toast({
        title: 'Erro ao vincular fornecedor',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Fornecedor vinculado',
      description: `${existingSupplierName} foi vinculado com sucesso.`
    });
    
    onSuccess?.();
  } else {
    console.log('Criando novo fornecedor');
    
    // Usar serviço de criação completo
    const result = await createSupplierWithAuth({
      name: formData.name,
      email: formData.email,
      document_number: formData.cnpj,
      // ... outros campos
      clientId: currentClientId,
      type: formData.type
    });
    
    if (result.success) {
      toast({
        title: 'Fornecedor criado',
        description: 'O fornecedor foi criado e vinculado com sucesso.'
      });
      onSuccess?.();
    }
  }
};
```

---

## Estados Visuais

### 🔄 Verificando

```
┌─────────────────────────────────────┐
│ 🔄 Verificando CNPJ...              │
└─────────────────────────────────────┘
```

### ✅ Fornecedor Existe

```
┌─────────────────────────────────────┐
│ ✅ Fornecedor já existe:            │
│    Fornecedor Alpha    [Será vinculado] │
└─────────────────────────────────────┘
```

### 🆕 Fornecedor Novo

```
┌─────────────────────────────────────┐
│ ℹ️  CNPJ não encontrado             │
│                        [Será criado] │
└─────────────────────────────────────┘
```

---

## Fluxo Completo

```
Usuário digita CNPJ
       ↓
Debounce de 500ms
       ↓
┌──────────────────┐
│ Buscar em        │
│ suppliers table  │
└──────────────────┘
       ↓
       ├─→ Encontrado ─→ Exibir feedback "Será vinculado"
       │                  └─→ Na submissão: criar apenas associação
       │
       └─→ Não encontrado ─→ Exibir feedback "Será criado"
                             └─→ Na submissão: criar fornecedor + associação
```

---

## Exemplo Completo: Modal de Criação

```tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CNPJExistenceChecker } from '@/components/suppliers/forms/CNPJExistenceChecker';
import { createSupplierWithAuth } from '@/services/supplierCreationService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess?: () => void;
}

export const CreateSupplierModal = ({ open, onClose, clientId, onSuccess }: CreateSupplierModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingSupplierId, setExistingSupplierId] = useState<string | null>(null);
  const [existingSupplierName, setExistingSupplierName] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnpj: '',
    phone: '',
    state: '',
    city: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingSupplierId) {
        // Vincular fornecedor existente
        const { error } = await supabase
          .from('client_suppliers')
          .upsert({
            client_id: clientId,
            supplier_id: existingSupplierId,
            status: 'active',
            associated_at: new Date().toISOString()
          }, {
            onConflict: 'client_id,supplier_id'
          });

        if (error) throw error;

        toast({
          title: 'Fornecedor vinculado',
          description: `${existingSupplierName} foi vinculado com sucesso.`
        });
      } else {
        // Criar novo fornecedor
        const result = await createSupplierWithAuth({
          name: formData.name,
          email: formData.email,
          document_number: formData.cnpj,
          phone: formData.phone,
          state: formData.state,
          city: formData.city,
          specialties: [],
          clientId: clientId,
          type: 'local'
        });

        if (!result.success) {
          throw new Error('Falha ao criar fornecedor');
        }

        toast({
          title: 'Fornecedor criado',
          description: 'O fornecedor foi criado e vinculado com sucesso.'
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao processar fornecedor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o fornecedor.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar/Vincular Fornecedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CNPJ com verificação */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
              required
            />
            <CNPJExistenceChecker
              cnpj={formData.cnpj}
              onSupplierFound={(id, name) => {
                setExistingSupplierId(id);
                setExistingSupplierName(name);
              }}
            />
          </div>

          {/* Outros campos */}
          {!existingSupplierId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              {/* ... mais campos */}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processando...' : existingSupplierId ? 'Vincular' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Benefícios desta Abordagem

### ✅ UX Melhorada
Usuário recebe feedback instantâneo sobre o que vai acontecer

### ✅ Evita Duplicação
Sistema verifica automaticamente antes da submissão

### ✅ Transparência
Usuário sabe se está criando ou vinculando

### ✅ Performance
Debounce de 500ms evita queries excessivas

### ✅ Flexibilidade
Callback `onSupplierFound` permite lógica customizada

---

## Próximos Passos

1. ✅ Integrar `CNPJExistenceChecker` no formulário principal
2. ✅ Ajustar lógica de submissão para lidar com ambos os casos
3. ✅ Testar fluxo completo de criação vs vinculação
4. ✅ Adicionar mensagens de toast apropriadas
5. ✅ Atualizar documentação de uso

---

**Arquivo do componente**: `src/components/suppliers/forms/CNPJExistenceChecker.tsx`
