import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTRACT_TYPES, CONTRACT_STATUSES } from '@/constants/contracts';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Building2 } from 'lucide-react';

interface BasicInfoStepProps {
  data: any;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
}

export function BasicInfoStep({ data, errors, onChange }: BasicInfoStepProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    const loadSuppliers = async () => {
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (suppliersData) setSuppliers(suppliersData);
    };

    loadSuppliers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-primary/10 rounded-lg">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Informações Básicas</h3>
          <p className="text-sm text-muted-foreground">
            Dados principais do contrato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">
            Título do Contrato <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Ex: Contrato de Fornecimento de Material de Limpeza"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract_type">
            Tipo de Contrato <span className="text-destructive">*</span>
          </Label>
          <Select value={data.contract_type} onValueChange={(value) => onChange('contract_type', value)}>
            <SelectTrigger className={errors.contract_type ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTRACT_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contract_type && (
            <p className="text-sm text-destructive">{errors.contract_type}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier_id">
            Fornecedor <span className="text-destructive">*</span>
          </Label>
          <Select value={data.supplier_id} onValueChange={(value) => onChange('supplier_id', value)}>
            <SelectTrigger className={errors.supplier_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione o fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {supplier.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplier_id && (
            <p className="text-sm text-destructive">{errors.supplier_id}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Descreva o objeto e os detalhes principais do contrato..."
            rows={4}
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Máximo 2000 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={data.status} onValueChange={(value) => onChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTRACT_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
