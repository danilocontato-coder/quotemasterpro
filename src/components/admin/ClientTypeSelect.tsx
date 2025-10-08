import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Network, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientTypeSelectProps {
  value: string;
  onChange: (value: 'direct' | 'administradora' | 'condominio_vinculado') => void;
  disabled?: boolean;
}

export const ClientTypeSelect: React.FC<ClientTypeSelectProps> = ({ value, onChange, disabled }) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o tipo de cliente" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="direct">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <div>
              <div className="font-medium">Direto</div>
              <div className="text-xs text-muted-foreground">Cliente com contrato próprio</div>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="administradora">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <div>
              <div className="font-medium">Administradora</div>
              <div className="text-xs text-muted-foreground">Gerencia múltiplos condomínios</div>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="condominio_vinculado">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <div>
              <div className="font-medium">Condomínio Vinculado</div>
              <div className="text-xs text-muted-foreground">Vinculado a uma administradora</div>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

interface ClientTypeBadgeProps {
  type?: 'direct' | 'administradora' | 'condominio_vinculado';
  parentName?: string;
}

export const ClientTypeBadge: React.FC<ClientTypeBadgeProps> = ({ type = 'direct', parentName }) => {
  if (type === 'administradora') {
    return (
      <Badge variant="default" className="bg-purple-500">
        <Network className="h-3 w-3 mr-1" />
        Administradora
      </Badge>
    );
  }
  
  if (type === 'condominio_vinculado') {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="secondary">
          <Home className="h-3 w-3 mr-1" />
          Vinculado
        </Badge>
        {parentName && (
          <span className="text-xs text-muted-foreground">→ {parentName}</span>
        )}
      </div>
    );
  }
  
  return (
    <Badge variant="outline">
      <Building2 className="h-3 w-3 mr-1" />
      Direto
    </Badge>
  );
};
