import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Shield, 
  Users, 
  Cloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Zap
} from 'lucide-react';

/**
 * Componente para mostrar o status da integração com Supabase
 * Aparece em páginas importantes para lembrar ao usuário sobre a integração
 */
export function SupabaseIntegrationStatus() {
  // Mock status - em produção seria dinâmico
  const isConnected = false; // Fase 1 sempre false
  const features = [
    { name: 'Autenticação', status: 'pending', icon: Shield },
    { name: 'Banco de Dados', status: 'pending', icon: Database },
    { name: 'Storage', status: 'pending', icon: Cloud },
    { name: 'Edge Functions', status: 'pending', icon: Zap },
    { name: 'RLS Policies', status: 'pending', icon: Users }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isConnected) {
    return null; // Não mostra se já está conectado
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Database className="h-5 w-5" />
          Integração Supabase - Fase 1 (Mock Data)
        </CardTitle>
        <CardDescription className="text-blue-700">
          Atualmente executando com dados simulados. Integre com Supabase para funcionalidade completa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status das Features */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((feature) => (
            <div key={feature.name} className="flex items-center gap-2 p-2 bg-white rounded-lg">
              <feature.icon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">{feature.name}</span>
              <div className="ml-auto">
                {getStatusIcon(feature.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Próximos passos (Fase 2):</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Autenticação real com JWT e Google OAuth</li>
            <li>Banco de dados PostgreSQL com RLS</li>
            <li>Storage seguro para arquivos</li>
            <li>Edge Functions para regras de negócio</li>
            <li>Notificações em tempo real</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-blue-200">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Dados Mock Ativos
          </Badge>
          <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentação Supabase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}