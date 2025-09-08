import React, { memo, useMemo, useCallback } from 'react';
import { withPerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { VirtualizedList, OptimizedTable } from '@/components/ui/optimized-components';
import { useSupabaseAdminClients } from '@/hooks/useSupabaseAdminClients';

// Componente de linha da tabela otimizado
const OptimizedClientRow = memo(({ 
  client, 
  onEdit, 
  onView, 
  onDelete 
}: {
  client: any;
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (client: any) => void;
}) => {
  const getStatusColor = useCallback((status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800", 
      pending: "bg-yellow-100 text-yellow-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  }, []);

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {client.companyName?.charAt(0) || 'C'}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-foreground">
              {client.companyName}
            </div>
            <div className="text-sm text-muted-foreground">
              {client.cnpj}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        <div>
          <div className="flex items-center">
            <span className="mr-2">📧</span>
            {client.email}
          </div>
          {client.phone && (
            <div className="flex items-center mt-1">
              <span className="mr-2">📞</span>
              {client.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
          {client.status === 'active' ? 'Ativo' : 
           client.status === 'inactive' ? 'Inativo' : 'Pendente'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        R$ {client.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {client.quotesCount || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end items-center space-x-2">
          <button
            onClick={() => onView(client)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
            title="Visualizar"
          >
            👁️
          </button>
          <button
            onClick={() => onEdit(client)}
            className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(client)}
            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
});

// Componente de tabela de clientes otimizada
const OptimizedClientsTable = memo(({ 
  clients,
  onEdit,
  onView,
  onDelete
}: {
  clients: any[];
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (client: any) => void;
}) => {
  // Renderizar função para lista virtualizada
  const renderClientRow = useCallback((client: any, index: number) => (
    <OptimizedClientRow
      key={client.id}
      client={client}
      onEdit={onEdit}
      onView={onView}
      onDelete={onDelete}
    />
  ), [onEdit, onView, onDelete]);

  if (clients.length > 50) {
    // Usar lista virtualizada para muitos clientes
    return (
      <div className="bg-background border rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Clientes ({clients.length})</h3>
        </div>
        <VirtualizedList
          items={clients}
          renderItem={renderClientRow}
          height={600}
          itemHeight={80}
          className="p-4"
        />
      </div>
    );
  }

  // Tabela normal para poucos clientes
  return (
    <OptimizedTable className="bg-background border rounded-lg">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cliente
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Contato
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Receita
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cotações
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Ações
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {clients.map(client => (
          <OptimizedClientRow
            key={client.id}
            client={client}
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </OptimizedTable>
  );
});

// Aplicar HOC de otimização
export const PerformantClientsTable = withPerformanceOptimization(OptimizedClientsTable, {
  displayName: 'PerformantClientsTable',
  trackRenders: true
});