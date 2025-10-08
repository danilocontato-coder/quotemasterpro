import React from 'react';
import { Building2, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdministradora } from '@/contexts/AdministradoraContext';

export const ClientContextSwitcher: React.FC = () => {
  const { currentClientId, setCurrentClientId, condominios, isLoading } = useAdministradora();

  if (isLoading) {
    return (
      <div className="h-10 w-80 bg-muted animate-pulse rounded-md" />
    );
  }

  return (
    <Select value={currentClientId || 'all'} onValueChange={setCurrentClientId}>
      <SelectTrigger className="w-80 bg-white border-green-200 focus:ring-green-500">
        <Building2 className="h-4 w-4 mr-2 text-green-600" />
        <SelectValue placeholder="Visão Geral" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-600" />
            <span className="font-medium">Visão Geral (Todos os condomínios)</span>
          </div>
        </SelectItem>
        <SelectSeparator />
        {condominios.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Nenhum condomínio vinculado
          </div>
        ) : (
          condominios.map(condo => (
            <SelectItem key={condo.id} value={condo.id}>
              <div className="flex items-center gap-2 w-full">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="flex-1">{condo.name}</span>
                {condo.activeQuotes > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {condo.activeQuotes} cotações
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
