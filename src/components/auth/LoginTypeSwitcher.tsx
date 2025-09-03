import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Users, User } from 'lucide-react';

interface LoginTypeSwitcherProps {
  activeType: 'client' | 'supplier' | 'admin';
  onTypeChange: (type: 'client' | 'supplier' | 'admin') => void;
}

export const LoginTypeSwitcher: React.FC<LoginTypeSwitcherProps> = ({
  activeType,
  onTypeChange
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg mb-6">
      <Button
        variant={activeType === 'client' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTypeChange('client')}
        className="flex items-center gap-2"
      >
        <Building2 className="h-4 w-4" />
        Cliente
      </Button>
      <Button
        variant={activeType === 'supplier' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTypeChange('supplier')}
        className="flex items-center gap-2"
      >
        <Users className="h-4 w-4" />
        Fornecedor
      </Button>
      <Button
        variant={activeType === 'admin' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTypeChange('admin')}
        className="flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        Admin
      </Button>
    </div>
  );
};