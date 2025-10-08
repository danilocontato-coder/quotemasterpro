import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientHierarchyTree } from './ClientHierarchyTree';
import { AdminClient } from '@/hooks/useSupabaseAdminClients';
import { Building2 } from 'lucide-react';

interface HierarchyViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AdminClient[];
  onClientClick?: (client: AdminClient) => void;
}

export const HierarchyViewModal: React.FC<HierarchyViewModalProps> = ({ 
  open, 
  onOpenChange, 
  clients,
  onClientClick 
}) => {
  console.log('🌳 [HierarchyViewModal] Renderizando com', clients.length, 'clientes');

  // Separar clientes por tipo
  const administradoras = clients.filter(c => c.clientType === 'administradora');
  const clientesDiretos = clients.filter(c => c.clientType === 'direct');
  
  console.log('🌳 [HierarchyViewModal] Administradoras:', administradoras.length);
  console.log('🌳 [HierarchyViewModal] Clientes Diretos:', clientesDiretos.length);

  // Mapear condomínios vinculados para cada administradora
  const administradorasComHierarquia = administradoras.map(admin => {
    const condominios = clients.filter(c => c.parentClientId === admin.id);
    console.log(`🌳 [HierarchyViewModal] Admin "${admin.companyName}" tem ${condominios.length} condomínios`);
    
    return {
      ...admin,
      childClients: condominios
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualização Hierárquica de Clientes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Administradoras com seus condomínios */}
          {administradorasComHierarquia.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Administradoras e Condomínios Vinculados
              </h3>
              {administradorasComHierarquia.map(admin => (
                <ClientHierarchyTree 
                  key={admin.id}
                  client={admin}
                  onClientClick={onClientClick}
                />
              ))}
            </div>
          )}
          
          {/* Clientes diretos (sem hierarquia) */}
          {clientesDiretos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Clientes Diretos ({clientesDiretos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clientesDiretos.map(client => (
                    <div 
                      key={client.id} 
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
                      onClick={() => onClientClick?.(client)}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium">{client.companyName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {client.cnpj}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado vazio */}
          {administradorasComHierarquia.length === 0 && clientesDiretos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente cadastrado ainda</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
