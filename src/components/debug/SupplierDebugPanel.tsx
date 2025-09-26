import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bug, Play, Trash2, Copy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  step: string;
  message: string;
  data?: any;
}

export function SupplierDebugPanel() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const addLog = (level: DebugLog['level'], step: string, message: string, data?: any) => {
    const log: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      step,
      message,
      data
    };
    
    setLogs(prev => [...prev, log]);
    console.log(`[SUPPLIER-DEBUG] ${step}: ${message}`, data);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()} - ${log.step}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logText);
    toast({
      title: "Logs copiados",
      description: "Os logs foram copiados para a área de transferência",
    });
  };

  const testSupplierCreation = async () => {
    setIsRunning(true);
    clearLogs();

    try {
      addLog('info', 'INIT', 'Iniciando teste de cadastro de fornecedor');

      // Step 1: Check authentication
      addLog('info', 'AUTH_CHECK', 'Verificando autenticação...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        addLog('error', 'AUTH_CHECK', 'Erro ao verificar autenticação', authError);
        return;
      }
      
      if (!authUser) {
        addLog('error', 'AUTH_CHECK', 'Usuário não autenticado');
        return;
      }
      
      addLog('success', 'AUTH_CHECK', 'Usuário autenticado', { 
        id: authUser.id, 
        email: authUser.email 
      });

      // Step 2: Get user profile
      addLog('info', 'PROFILE_CHECK', 'Buscando perfil do usuário...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, client_id, role, name')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        addLog('error', 'PROFILE_CHECK', 'Erro ao buscar perfil', profileError);
        return;
      }

      if (!profile) {
        addLog('error', 'PROFILE_CHECK', 'Perfil não encontrado');
        return;
      }

      addLog('success', 'PROFILE_CHECK', 'Perfil encontrado', profile);

      if (!profile.client_id) {
        addLog('error', 'PROFILE_CHECK', 'Cliente não associado ao perfil');
        return;
      }

      // Step 3: Check client exists
      addLog('info', 'CLIENT_CHECK', 'Verificando cliente...');
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, status')
        .eq('id', profile.client_id)
        .single();

      if (clientError) {
        addLog('error', 'CLIENT_CHECK', 'Erro ao buscar cliente', clientError);
        return;
      }

      addLog('success', 'CLIENT_CHECK', 'Cliente encontrado', client);

      // Step 4: Test RLS functions
      addLog('info', 'RLS_FUNCTIONS', 'Testando funções RLS...');
      
      try {
        const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
        if (roleError) {
          addLog('warn', 'RLS_FUNCTIONS', 'Erro ao buscar role', roleError);
        } else {
          addLog('success', 'RLS_FUNCTIONS', 'Função get_user_role executada', { role: roleData });
        }

        const { data: clientIdData, error: clientIdError } = await supabase.rpc('get_current_user_client_id');
        if (clientIdError) {
          addLog('warn', 'RLS_FUNCTIONS', 'Erro ao buscar client_id', clientIdError);
        } else {
          addLog('success', 'RLS_FUNCTIONS', 'Função get_current_user_client_id executada', { client_id: clientIdData });
        }
      } catch (error) {
        addLog('warn', 'RLS_FUNCTIONS', 'Erro nas funções RLS', error);
      }

      // Step 5: Prepare test data
      const testSupplierData = {
        name: `Fornecedor Teste ${Date.now()}`,
        cnpj: `${Math.floor(Math.random() * 100000000)}0001${Math.floor(Math.random() * 100)}`,
        email: `teste${Date.now()}@fornecedor.com`,
        phone: '(11) 99999-9999',
        whatsapp: '(11) 99999-9999',
        website: 'https://teste.com',
        state: 'SP',
        city: 'São Paulo',
        address: 'Rua Teste, 123',
        specialties: ['Limpeza', 'Manutenção'],
        type: 'local' as const,
        status: 'active' as const,
        rating: 0,
        completed_orders: 0
      };

      addLog('info', 'DATA_PREP', 'Dados de teste preparados', testSupplierData);

      // Step 6: Test supplier creation
      addLog('info', 'SUPPLIER_INSERT', 'Tentando inserir fornecedor...');
      
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .insert([testSupplierData])
        .select()
        .single();

      if (supplierError) {
        addLog('error', 'SUPPLIER_INSERT', 'Erro ao inserir fornecedor', {
          error: supplierError,
          code: supplierError.code,
          message: supplierError.message,
          details: supplierError.details,
          hint: supplierError.hint
        });
        return;
      }

      addLog('success', 'SUPPLIER_INSERT', 'Fornecedor inserido com sucesso', supplierData);

      // Step 7: Test client-supplier association
      if (supplierData) {
        addLog('info', 'ASSOCIATION', 'Criando associação cliente-fornecedor...');
        
        const { data: associationData, error: associationError } = await supabase
          .from('client_suppliers')
          .insert({
            client_id: profile.client_id,
            supplier_id: supplierData.id,
            status: 'active'
          })
          .select()
          .single();

        if (associationError) {
          addLog('error', 'ASSOCIATION', 'Erro ao criar associação', associationError);
        } else {
          addLog('success', 'ASSOCIATION', 'Associação criada com sucesso', associationData);
        }
      }

      // Step 8: Cleanup - delete test data
      if (supplierData) {
        addLog('info', 'CLEANUP', 'Removendo dados de teste...');
        
        // Delete association first
        await supabase
          .from('client_suppliers')
          .delete()
          .eq('supplier_id', supplierData.id);

        // Delete supplier
        const { error: deleteError } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', supplierData.id);

        if (deleteError) {
          addLog('warn', 'CLEANUP', 'Erro ao remover fornecedor de teste', deleteError);
        } else {
          addLog('success', 'CLEANUP', 'Dados de teste removidos com sucesso');
        }
      }

      addLog('success', 'COMPLETE', 'Teste concluído com sucesso! ✅');

    } catch (error) {
      addLog('error', 'UNEXPECTED', 'Erro inesperado', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warn': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            <CardTitle>Debug - Cadastro de Fornecedor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyLogs}
              disabled={logs.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <strong>Usuário:</strong> {user?.email} | <strong>Role:</strong> {user?.role}
          </div>
          <Button
            onClick={testSupplierCreation}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Executando...' : 'Executar Teste'}
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-96 w-full">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum log ainda. Clique em "Executar Teste" para começar.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="space-y-2">
                  <div className={`p-3 rounded-lg border ${getLevelColor(log.level)}`}>
                    <div className="flex items-start gap-2">
                      {getLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.step}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {log.message}
                        </div>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver dados (clique para expandir)
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}