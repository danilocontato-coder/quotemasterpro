import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Mail, Phone, Star, MapPin, Edit, Trash2, Power, Link, Unlink } from 'lucide-react';
import { AdministradoraSupplier } from '@/hooks/useAdministradoraSuppliersManagement';

interface AdministradoraSupplierCardProps {
  supplier: AdministradoraSupplier;
  onEdit?: (supplier: AdministradoraSupplier) => void;
  onDelete?: (supplier: AdministradoraSupplier) => void;
  onToggleStatus?: (supplier: AdministradoraSupplier) => void;
  onLink?: (supplier: AdministradoraSupplier) => void;
  onUnlink?: (supplier: AdministradoraSupplier) => void;
  onViewDetails?: (supplier: AdministradoraSupplier) => void;
  readOnly?: boolean;
}

export const AdministradoraSupplierCard: React.FC<AdministradoraSupplierCardProps> = ({
  supplier,
  onEdit,
  onDelete,
  onToggleStatus,
  onLink,
  onUnlink,
  onViewDetails,
  readOnly = false,
}) => {
  const getSourceBadge = () => {
    switch (supplier.source) {
      case 'administradora':
        return <Badge variant="default">Administradora</Badge>;
      case 'condominio':
        return <Badge variant="secondary">{supplier.condominio_name}</Badge>;
      case 'certified':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Certificado</Badge>;
    }
  };

  const getStatusBadge = () => {
    switch (supplier.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{supplier.status}</Badge>;
    }
  };

  const canEdit = supplier.source === 'administradora' && !readOnly;
  const canLink = supplier.source === 'certified' && !readOnly;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails?.(supplier)}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base">{supplier.name}</h3>
            {supplier.is_certified && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                <Star className="w-3 h-3 mr-1" />
                Certificado
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">CNPJ: {supplier.cnpj}</p>
        </div>

        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(supplier); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus?.(supplier); }}>
                    <Power className="w-4 h-4 mr-2" />
                    {supplier.status === 'active' ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(supplier); }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
              {canLink && (
                <>
                  {supplier.is_linked ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnlink?.(supplier); }}>
                      <Unlink className="w-4 h-4 mr-2" />
                      Desvincular
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLink?.(supplier); }}>
                      <Link className="w-4 h-4 mr-2" />
                      Vincular
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {getSourceBadge()}
          {getStatusBadge()}
          {supplier.is_linked && supplier.source === 'certified' && (
            <Badge variant="default" className="bg-blue-500">Vinculado</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            <span>{supplier.email}</span>
          </div>
          {supplier.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{supplier.phone}</span>
            </div>
          )}
        </div>

        {(supplier.city || supplier.state) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{[supplier.city, supplier.state].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {supplier.specialties && supplier.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {supplier.specialties.slice(0, 3).map((specialty) => (
              <Badge key={specialty} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {supplier.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{supplier.specialties.length - 3}
              </Badge>
            )}
          </div>
        )}

        {supplier.rating !== undefined && supplier.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{supplier.rating.toFixed(1)}</span>
            {supplier.completed_orders && (
              <span className="text-xs text-muted-foreground ml-2">
                {supplier.completed_orders} pedidos
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
