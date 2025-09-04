import React, { memo } from 'react';

interface OptimizedClientRowProps {
  client: any;
  clientGroups: any[];
  plans: any[];
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (client: any) => void;
  onCredentials: (client: any) => void;
  onDocuments: (client: any) => void;
}

export const OptimizedClientRow = memo(({ 
  client, 
  clientGroups, 
  plans, 
  onEdit, 
  onView, 
  onDelete, 
  onCredentials, 
  onDocuments 
}: OptimizedClientRowProps) => {
  const group = clientGroups.find(g => g.id === client.groupId);
  const plan = plans.find(p => p.id === client.plan);

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800", 
      pending: "bg-yellow-100 text-yellow-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
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
        {plan?.display_name || client.plan || 'Sem plano'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {group ? (
          <div className="flex items-center">
            <div 
              className="w-2 h-2 rounded-full mr-2" 
              style={{ backgroundColor: group.color }}
            ></div>
            {group.name}
          </div>
        ) : (
          <span className="text-gray-400">Sem grupo</span>
        )}
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
            className="text-blue-600 hover:text-blue-900 p-1 rounded"
            title="Visualizar"
          >
            👁️
          </button>
          <button
            onClick={() => onEdit(client)}
            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={() => onCredentials(client)}
            className="text-green-600 hover:text-green-900 p-1 rounded"
            title="Credenciais"
          >
            🔑
          </button>
          <button
            onClick={() => onDocuments(client)}
            className="text-purple-600 hover:text-purple-900 p-1 rounded"
            title="Documentos"
          >
            📄
          </button>
          <button
            onClick={() => onDelete(client)}
            className="text-red-600 hover:text-red-900 p-1 rounded"
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </td>
    </>
  );
});