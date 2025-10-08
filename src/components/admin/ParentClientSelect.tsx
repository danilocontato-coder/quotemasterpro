import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Network } from 'lucide-react';
import { AdminClient } from '@/hooks/useSupabaseAdminClients';

interface ParentClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  administradoras: AdminClient[];
  disabled?: boolean;
}

export const ParentClientSelect: React.FC<ParentClientSelectProps> = ({ 
  value, 
  onChange, 
  administradoras,
  disabled 
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Network className="h-4 w-4" />
        Administradora
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a administradora" />
        </SelectTrigger>
        <SelectContent>
          {administradoras.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              Nenhuma administradora disponível
            </div>
          ) : (
            administradoras.map((admin) => (
              <SelectItem key={admin.id} value={admin.id}>
                <div className="flex items-center gap-2">
                  <Network className="h-3 w-3" />
                  <div>
                    <div className="font-medium">{admin.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {admin.childClientsCount || 0} condomínio(s) vinculado(s)
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
