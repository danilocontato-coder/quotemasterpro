import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SupplierFormFieldsProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

const SPECIALTIES = [
  'Limpeza',
  'Manutenção',
  'Segurança',
  'Jardinagem',
  'Elétrica',
  'Hidráulica',
  'Pintura',
  'Marcenaria',
  'Alvenaria',
  'Outros',
];

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const SupplierFormFields: React.FC<SupplierFormFieldsProps> = ({
  formData,
  onChange,
  errors = {},
}) => {
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  return (
    <div className="space-y-4">
      {/* Dados Básicos */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Dados Básicos</h3>
        
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Nome do fornecedor"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formData.cnpj || ''}
              onChange={(e) => onChange('cnpj', formatCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={errors.cnpj ? 'border-red-500' : ''}
            />
            {errors.cnpj && <p className="text-xs text-red-500 mt-1">{errors.cnpj}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="email@exemplo.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => onChange('phone', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp || ''}
              onChange={(e) => onChange('whatsapp', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website || ''}
            onChange={(e) => onChange('website', e.target.value)}
            placeholder="https://www.exemplo.com"
          />
        </div>

        <div>
          <Label htmlFor="faturamento_mensal">
            Faturamento Mensal (R$)
            <span className="text-xs text-muted-foreground ml-1">(Opcional, mas recomendado para carteira Asaas)</span>
          </Label>
          <Input
            id="faturamento_mensal"
            type="number"
            min="0"
            step="0.01"
            value={formData.business_info?.faturamento_mensal || ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : null;
              onChange('business_info', {
                ...formData.business_info,
                faturamento_mensal: value
              });
            }}
            placeholder="Ex: 10000.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Informe o faturamento mensal estimado. Este campo é usado para criar a carteira digital Asaas (obrigatório pela regulação).
          </p>
        </div>
      </div>

      {/* Localização */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Localização</h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="state">Estado</Label>
            <Select
              value={formData.state || ''}
              onValueChange={(value) => onChange('state', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="Nome da cidade"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="region">Região de Atuação</Label>
          <Input
            id="region"
            value={formData.region || ''}
            onChange={(e) => onChange('region', e.target.value)}
            placeholder="Ex: Zona Sul, Centro, etc."
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Endereço</h3>
        
        <div>
          <Label htmlFor="street">Rua</Label>
          <Input
            id="street"
            value={formData.address?.street || ''}
            onChange={(e) => onChange('address', { ...formData.address, street: e.target.value })}
            placeholder="Nome da rua"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={formData.address?.number || ''}
              onChange={(e) => onChange('address', { ...formData.address, number: e.target.value })}
              placeholder="Nº"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={formData.address?.complement || ''}
              onChange={(e) => onChange('address', { ...formData.address, complement: e.target.value })}
              placeholder="Apto, Sala, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={formData.address?.neighborhood || ''}
              onChange={(e) => onChange('address', { ...formData.address, neighborhood: e.target.value })}
              placeholder="Nome do bairro"
            />
          </div>

          <div>
            <Label htmlFor="postal_code">CEP</Label>
            <Input
              id="postal_code"
              value={formData.address?.postal_code || ''}
              onChange={(e) => onChange('address', { ...formData.address, postal_code: e.target.value })}
              placeholder="00000-000"
              maxLength={9}
            />
          </div>
        </div>
      </div>

      {/* Especialidades */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Especialidades</h3>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map(specialty => (
            <label key={specialty} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.specialties?.includes(specialty) || false}
                onChange={(e) => {
                  const current = formData.specialties || [];
                  const updated = e.target.checked
                    ? [...current, specialty]
                    : current.filter((s: string) => s !== specialty);
                  onChange('specialties', updated);
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{specialty}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status || 'active'}
          onValueChange={(value) => onChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
