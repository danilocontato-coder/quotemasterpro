import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Network, Home, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminClient } from '@/hooks/useSupabaseAdminClients';
import { cn } from '@/lib/utils';

interface ClientHierarchyTreeProps {
  client: AdminClient;
  onClientClick?: (client: AdminClient) => void;
  level?: number;
}

export const ClientHierarchyTree: React.FC<ClientHierarchyTreeProps> = ({ 
  client, 
  onClientClick,
  level = 0 
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = client.clientType === 'administradora' && (client.childClients?.length || 0) > 0;

  const getIcon = () => {
    if (client.clientType === 'administradora') return Network;
    if (client.clientType === 'condominio_vinculado') return Home;
    return Building2;
  };

  const Icon = getIcon();

  return (
    <div className={cn("border-l-2 border-border/50", level > 0 && "ml-6")}>
      <div 
        className={cn(
          "flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer",
          level === 0 && "font-medium"
        )}
        onClick={() => onClientClick?.(client)}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        <Icon className={cn("h-4 w-4", client.clientType === 'administradora' && "text-purple-500")} />
        
        <span>{client.companyName}</span>
        
        {client.clientType === 'administradora' && (
          <Badge variant="secondary" className="ml-auto">
            {client.childClientsCount || 0} vinculado(s)
          </Badge>
        )}
        
        {client.clientType === 'condominio_vinculado' && client.parentClientName && (
          <span className="text-xs text-muted-foreground ml-auto">
            → {client.parentClientName}
          </span>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {client.childClients?.map((child) => (
            <ClientHierarchyTree
              key={child.id}
              client={child}
              onClientClick={onClientClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
