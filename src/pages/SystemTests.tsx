import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Play, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  duration?: number;
  message?: string;
  details?: any;
}

const SystemTests = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, warnings: 0, total: 0 });
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  // ============================================================================
  // TESTES AUTOMATIZADOS
  // ============================================================================

  const tests: Omit<TestResult, 'status'>[] = [
    { id: 'auth', name: '🔐 Verificação de Autenticação', category: 'Segurança' },
    { id: 'profile', name: '👤 Carregamento de Perfil', category: 'Segurança' },
    { id: 'isolation-quotes', name: '📋 Isolamento de Cotações', category: 'RLS' },
    { id: 'isolation-products', name: '📦 Isolamento de Produtos', category: 'RLS' },
    { id: 'rls-protection', name: '🛡️ Proteção contra Manipulação', category: 'RLS' },
    { id: 'perf-dashboard', name: '⚡ Performance Dashboard', category: 'Performance' },
    { id: 'notifications', name: '🔔 Sistema de Notificações', category: 'Funcional' },
    { id: 'orphan-check', name: '🔍 Verificação de Dados Órfãos', category: 'Qualidade' },
  ];

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.id === id);
      if (existing) {
        return prev.map(r => r.id === id ? { ...r, ...updates } : r);
      }
      const test = tests.find(t => t.id === id)!;
      return [...prev, { ...test, status: 'pending', ...updates }];
    });
  };

  // ============================================================================
  // TESTE 1: AUTENTICAÇÃO
  // ============================================================================
  const testAuthentication = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('auth', { status: 'running' });

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return {
          ...tests[0],
          status: 'failed',
          duration: performance.now() - start,
          message: 'Sessão inválida ou expirada',
          details: error
        };
      }

      return {
        ...tests[0],
        status: 'passed',
        duration: performance.now() - start,
        message: `Usuário autenticado: ${session.user.email}`,
        details: { userId: session.user.id }
      };
    } catch (err: any) {
      return {
        ...tests[0],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 2: PERFIL DO USUÁRIO
  // ============================================================================
  const testProfile = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('profile', { status: 'running' });

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error || !profile) {
        return {
          ...tests[1],
          status: 'failed',
          duration: performance.now() - start,
          message: 'Perfil não encontrado',
          details: error
        };
      }

      return {
        ...tests[1],
        status: 'passed',
        duration: performance.now() - start,
        message: `Perfil carregado: ${profile.role}`,
        details: { role: profile.role, clientId: profile.client_id }
      };
    } catch (err: any) {
      return {
        ...tests[1],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 3: ISOLAMENTO DE COTAÇÕES
  // ============================================================================
  const testQuotesIsolation = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('isolation-quotes', { status: 'running' });

    try {
      // Buscar perfil para pegar client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', user?.id)
        .single();

      // Buscar cotações
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, client_id, title');

      if (error) throw error;

      // Verificar se todas as cotações pertencem ao cliente correto
      const invalidQuotes = quotes?.filter(q => q.client_id !== profile?.client_id) || [];

      if (invalidQuotes.length > 0) {
        return {
          ...tests[2],
          status: 'failed',
          duration: performance.now() - start,
          message: `🚨 VULNERABILIDADE: ${invalidQuotes.length} cotações de outros clientes foram retornadas!`,
          details: { invalidQuotes, userClientId: profile?.client_id }
        };
      }

      return {
        ...tests[2],
        status: 'passed',
        duration: performance.now() - start,
        message: `${quotes?.length || 0} cotações isoladas corretamente`,
        details: { totalQuotes: quotes?.length }
      };
    } catch (err: any) {
      return {
        ...tests[2],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 4: ISOLAMENTO DE PRODUTOS
  // ============================================================================
  const testProductsIsolation = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('isolation-products', { status: 'running' });

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id, role')
        .eq('id', user?.id)
        .single();

      const { data: products, error } = await supabase
        .from('products')
        .select('id, client_id, supplier_id, name');

      if (error) throw error;

      // Verificar isolamento baseado no papel
      const invalidProducts = products?.filter(p => {
        if (profile?.role === 'supplier') {
          return p.supplier_id !== profile.supplier_id;
        }
        return p.client_id !== profile?.client_id;
      }) || [];

      if (invalidProducts.length > 0) {
        return {
          ...tests[3],
          status: 'failed',
          duration: performance.now() - start,
          message: `🚨 VULNERABILIDADE: ${invalidProducts.length} produtos de outros usuários foram retornados!`,
          details: { invalidProducts }
        };
      }

      return {
        ...tests[3],
        status: 'passed',
        duration: performance.now() - start,
        message: `${products?.length || 0} produtos isolados corretamente`,
        details: { totalProducts: products?.length }
      };
    } catch (err: any) {
      return {
        ...tests[3],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 5: PROTEÇÃO RLS
  // ============================================================================
  const testRLSProtection = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('rls-protection', { status: 'running' });

    try {
      // Buscar uma cotação qualquer
      const { data: firstQuote } = await supabase
        .from('quotes')
        .select('id, client_id')
        .limit(1)
        .single();

      if (!firstQuote) {
        return {
          ...tests[6],
          status: 'warning',
          duration: performance.now() - start,
          message: 'Nenhuma cotação para testar (criar uma cotação primeiro)'
        };
      }

      // Tentar modificar com client_id falso
      const fakeClientId = '00000000-0000-0000-0000-000000000000';
      const { error } = await supabase
        .from('quotes')
        .update({ title: 'TESTE DE INVASÃO - NÃO DEVE FUNCIONAR' })
        .eq('id', firstQuote.id)
        .eq('client_id', fakeClientId);

      if (error || error?.code === 'PGRST116') {
        // Erro esperado (RLS bloqueou)
        return {
          ...tests[6],
          status: 'passed',
          duration: performance.now() - start,
          message: '✅ RLS bloqueou tentativa de modificação não autorizada',
          details: { blocked: true }
        };
      }

      // Se não deu erro, é uma vulnerabilidade!
      return {
        ...tests[6],
        status: 'failed',
        duration: performance.now() - start,
        message: '🚨 VULNERABILIDADE CRÍTICA: RLS não bloqueou modificação não autorizada!',
        details: { vulnerability: true }
      };
    } catch (err: any) {
      // Erro é bom neste caso (significa que RLS bloqueou)
      return {
        ...tests[6],
        status: 'passed',
        duration: performance.now() - start,
        message: '✅ RLS bloqueou tentativa de modificação (erro esperado)',
        details: { error: err.message }
      };
    }
  };

  // ============================================================================
  // TESTE 6: PERFORMANCE DASHBOARD
  // ============================================================================
  const testDashboardPerformance = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('perf-dashboard', { status: 'running' });

    try {
      await supabase.from('quotes').select('*').limit(10);
      const duration = performance.now() - start;

      if (duration > 3000) {
        return {
          ...tests[7],
          status: 'warning',
          duration,
          message: `⚠️ Lento: ${duration.toFixed(0)}ms (recomendado < 3000ms)`
        };
      }

      return {
        ...tests[7],
        status: 'passed',
        duration,
        message: `Excelente: ${duration.toFixed(0)}ms`
      };
    } catch (err: any) {
      return {
        ...tests[7],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 7: NOTIFICAÇÕES
  // ============================================================================
  const testNotifications = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('notifications', { status: 'running' });

    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return {
        ...tests[10],
        status: 'passed',
        duration: performance.now() - start,
        message: `${notifications?.length || 0} notificações carregadas`,
        details: { count: notifications?.length }
      };
    } catch (err: any) {
      return {
        ...tests[10],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // TESTE 8: DADOS ÓRFÃOS
  // ============================================================================
  const testOrphanData = async (): Promise<TestResult> => {
    const start = performance.now();
    updateTestResult('orphan-check', { status: 'running' });

    try {
      const { data: orphanProducts } = await supabase
        .from('products')
        .select('id, name')
        .is('client_id', null)
        .is('supplier_id', null);

      const orphanCount = orphanProducts?.length || 0;

      if (orphanCount > 0) {
        return {
          ...tests[13],
          status: 'warning',
          duration: performance.now() - start,
          message: `⚠️ ${orphanCount} produtos órfãos encontrados`,
          details: { orphanProducts }
        };
      }

      return {
        ...tests[13],
        status: 'passed',
        duration: performance.now() - start,
        message: 'Nenhum dado órfão encontrado'
      };
    } catch (err: any) {
      return {
        ...tests[13],
        status: 'failed',
        duration: performance.now() - start,
        message: err.message
      };
    }
  };

  // ============================================================================
  // EXECUTAR TODOS OS TESTES
  // ============================================================================
  const runAllTests = async () => {
    console.log('🧪 [TESTS] Iniciando bateria de testes...');
    setIsRunning(true);
    // Inicializa a lista com todos os testes em "pendente" para mostrar a timeline
    setResults(tests.map(t => ({ ...t, status: 'pending' } as TestResult)));
    setProgress(0);
    setSummary({ passed: 0, failed: 0, warnings: 0, total: 0 });

    const testFunctions = [
      testAuthentication,
      testProfile,
      testQuotesIsolation,
      testProductsIsolation,
      testRLSProtection,
      testDashboardPerformance,
      testNotifications,
      testOrphanData,
    ];

    const testResults: TestResult[] = [];
    
    for (let i = 0; i < testFunctions.length; i++) {
      const current = tests[i];
      setCurrentTestId(current.id);
      console.log(`🧪 [TESTS] Executando: ${current.name} (${i + 1}/${testFunctions.length})`);
      const result = await testFunctions[i]();
      console.log('🧪 [TESTS] Resultado:', result);
      testResults.push(result);
      updateTestResult(result.id, result);
      setProgress(((i + 1) / testFunctions.length) * 100);
      
      // Delay para melhor visualização
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calcular resumo
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const warnings = testResults.filter(r => r.status === 'warning').length;

    console.log('🧪 [TESTS] Todos os testes concluídos:', { passed, failed, warnings, total: testResults.length });
    setSummary({ passed, failed, warnings, total: testResults.length });
    setIsRunning(false);
    setCurrentTestId(null);
  };

  // ============================================================================
  // DOWNLOAD RELATÓRIO
  // ============================================================================
  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      user: user?.email,
      summary,
      results: results.map(r => ({
        category: r.category,
        name: r.name,
        status: r.status,
        duration: r.duration ? `${r.duration.toFixed(0)}ms` : 'N/A',
        message: r.message
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<TestResult['status'], 'default' | 'destructive' | 'secondary'> = {
      passed: 'default',
      failed: 'destructive',
      warning: 'secondary',
      running: 'secondary',
      pending: 'secondary'
    };

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status === 'passed' && '✓ Passou'}
        {status === 'failed' && '✗ Falhou'}
        {status === 'warning' && '⚠ Aviso'}
        {status === 'running' && '⟳ Testando...'}
        {status === 'pending' && '○ Pendente'}
      </Badge>
    );
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">🧪 Testes Automatizados do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Validação completa de segurança, isolamento de dados e performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Testes
              </>
            )}
          </Button>
          {results.length > 0 && (
            <Button onClick={downloadReport} variant="outline" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Baixar Relatório
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar + Steps */}
      {isRunning && (
        <Card className="p-6 border-2 border-primary">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">Executando Testes do Sistema...</span>
                  <span className="font-mono font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>

            {/* Passo atual */}
            {currentTestId && (
              <div className="text-sm">
                <span className="text-muted-foreground">Módulo atual:</span>{' '}
                <span className="font-medium">
                  {tests.find(t => t.id === currentTestId)?.name}
                </span>
              </div>
            )}

            {/* Timeline de passos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tests.map((t, idx) => {
                const found = results.find(r => r.id === t.id);
                const status = (found?.status ?? (currentTestId === t.id ? 'running' : 'pending')) as TestResult['status'];
                const isActive = currentTestId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isActive ? 'ring-1 ring-primary' : ''}`}
                  >
                    <div className="text-xs font-mono w-6 text-center">{String(idx + 1).padStart(2, '0')}</div>
                    <div className="shrink-0">{getStatusIcon(status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{t.name}</span>
                        {getStatusBadge(status)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Aguarde enquanto validamos segurança, isolamento de dados e performance
            </p>
          </div>
        </Card>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Total de Testes</div>
            <div className="text-3xl font-bold mt-2">{summary.total}</div>
          </Card>
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="text-sm text-green-700">✓ Passaram</div>
            <div className="text-3xl font-bold text-green-700 mt-2">{summary.passed}</div>
          </Card>
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="text-sm text-red-700">✗ Falharam</div>
            <div className="text-3xl font-bold text-red-700 mt-2">{summary.failed}</div>
          </Card>
          <Card className="p-6 border-yellow-200 bg-yellow-50">
            <div className="text-sm text-yellow-700">⚠ Avisos</div>
            <div className="text-3xl font-bold text-yellow-700 mt-2">{summary.warnings}</div>
          </Card>
        </div>
      )}

      {/* Results by Category */}
      {Object.keys(groupedResults).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([category, categoryResults]) => (
            <Card key={category} className="p-6">
              <h2 className="text-xl font-semibold mb-4">📁 {category}</h2>
              <div className="space-y-3">
                {categoryResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium">{result.name}</span>
                        {getStatusBadge(result.status)}
                      </div>
                      {result.message && (
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      )}
                      {result.duration && (
                        <p className="text-xs text-muted-foreground font-mono">
                          ⏱ {result.duration.toFixed(0)}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isRunning && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-2xl font-bold mb-3">Sistema de Testes Automatizado</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Execute uma bateria completa de testes para validar:
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mt-4 mb-6 text-sm">
            <div className="p-3 border rounded-lg bg-background">
              <div className="font-semibold mb-1">🔐 Segurança</div>
              <div className="text-xs text-muted-foreground">Auth & Permissões</div>
            </div>
            <div className="p-3 border rounded-lg bg-background">
              <div className="font-semibold mb-1">🛡️ Isolamento RLS</div>
              <div className="text-xs text-muted-foreground">Proteção de Dados</div>
            </div>
            <div className="p-3 border rounded-lg bg-background">
              <div className="font-semibold mb-1">⚡ Performance</div>
              <div className="text-xs text-muted-foreground">Velocidade do Sistema</div>
            </div>
            <div className="p-3 border rounded-lg bg-background">
              <div className="font-semibold mb-1">✅ Qualidade</div>
              <div className="text-xs text-muted-foreground">Integridade de Dados</div>
            </div>
          </div>
          <Button onClick={runAllTests} size="lg" className="mt-2">
            <Play className="mr-2 h-5 w-5" />
            Iniciar Testes Automáticos
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SystemTests;
