import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, Copy, RefreshCw, Database, User, Building2, FileText } from 'lucide-react';

interface DiagnosticReport {
  auth_user?: {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at?: string;
  } | null;
  profile?: {
    id: string;
    email: string;
    role: string;
    client_id?: string;
    supplier_id?: string;
    created_at: string;
  } | null;
  users?: {
    auth_user_id: string;
    client_id?: string;
    supplier_id?: string;
    status: string;
  } | null;
  entity?: {
    id: string;
    name: string;
    email: string;
  } | null;
  audit_logs?: any[];
  contradictions?: string[];
}

export function DebugAuthPanel() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [entityType, setEntityType] = useState<'client' | 'supplier'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  const runDiagnostic = async () => {
    if (!email.trim()) {
      toast({ title: 'Digite um e-mail', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('debug-auth-user', {
        body: { email: email.trim().toLowerCase(), entityType }
      });

      if (error) throw error;

      setReport(data.report);
      toast({ title: 'Diagnóstico concluído' });
    } catch (error: any) {
      console.error('Erro ao executar diagnóstico:', error);
      toast({ title: 'Erro no diagnóstico', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async () => {
    if (!report?.auth_user?.id) {
      toast({ title: 'Auth user não encontrado', variant: 'destructive' });
      return;
    }

    if (!report?.entity?.id) {
      toast({ title: 'Entidade não encontrada', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const rpcName = entityType === 'client' 
        ? 'create_profile_for_existing_auth'
        : 'create_profile_for_existing_auth_supplier';

      const params = entityType === 'client'
        ? {
            auth_id: report.auth_user.id,
            p_client_id: report.entity.id,
            email_param: email.trim().toLowerCase(),
            name_param: report.entity.name,
            role_param: 'manager'
          }
        : {
            auth_id: report.auth_user.id,
            p_supplier_id: report.entity.id,
            email_param: email.trim().toLowerCase(),
            name_param: report.entity.name,
            role_param: 'supplier'
          };

      const { error } = await supabase.rpc(rpcName, params);

      if (error) throw error;

      toast({ title: 'Profile criado/conciliado com sucesso!' });
      await runDiagnostic(); // Recarregar diagnóstico
    } catch (error: any) {
      console.error('Erro ao criar profile:', error);
      toast({ title: 'Erro ao criar profile', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!report?.auth_user?.id) {
      toast({ title: 'Auth user não encontrado', variant: 'destructive' });
      return;
    }

    const newPassword = prompt('Digite a nova senha (deixe vazio para gerar automaticamente):');
    if (newPassword === null) return; // Cancelado

    const generatedPassword = newPassword || generateStrongPassword();

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: email.trim().toLowerCase(),
          password: generatedPassword,
          temporaryPassword: !newPassword, // Se gerada automaticamente, é temporária
          action: 'reset_password'
        }
      });

      if (error) throw error;

      // Copiar senha para clipboard
      await navigator.clipboard.writeText(generatedPassword);

      toast({ 
        title: 'Senha resetada e copiada!', 
        description: `Nova senha: ${generatedPassword.substring(0, 4)}...`,
        duration: 6000
      });
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast({ title: 'Erro ao resetar senha', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resendCredentials = async () => {
    if (!report?.profile?.id) {
      toast({ title: 'Profile não encontrado - crie primeiro', variant: 'destructive' });
      return;
    }

    // Implementar reenvio de credenciais
    toast({ title: 'Funcionalidade em desenvolvimento', description: 'Use o painel principal para reenviar' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Autenticação</CardTitle>
          <CardDescription>
            Analise problemas de sincronização entre Auth, Profile e Entidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entityType">Tipo</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={runDiagnostic} disabled={isLoading} className="w-full">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Executar Diagnóstico
          </Button>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Auth User Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Auth User</CardTitle>
                </div>
                {report.auth_user ? (
                  <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Existe</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ausente</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {report.auth_user ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {report.auth_user.id}</div>
                  <div><strong>Email:</strong> {report.auth_user.email}</div>
                  <div><strong>Criado em:</strong> {new Date(report.auth_user.created_at).toLocaleString()}</div>
                  <div><strong>Email confirmado:</strong> {report.auth_user.email_confirmed_at ? 'Sim' : 'Não'}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum usuário Auth encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Profile Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Profile</CardTitle>
                </div>
                {report.profile ? (
                  <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Existe</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ausente</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {report.profile ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {report.profile.id}</div>
                  <div><strong>Email:</strong> {report.profile.email}</div>
                  <div><strong>Role:</strong> {report.profile.role}</div>
                  <div><strong>Client ID:</strong> {report.profile.client_id || 'N/A'}</div>
                  <div><strong>Supplier ID:</strong> {report.profile.supplier_id || 'N/A'}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Profile não encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Entity Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>{entityType === 'client' ? 'Cliente' : 'Fornecedor'}</CardTitle>
                </div>
                {report.entity ? (
                  <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Existe</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ausente</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {report.entity ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {report.entity.id}</div>
                  <div><strong>Nome:</strong> {report.entity.name}</div>
                  <div><strong>Email:</strong> {report.entity.email}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Entidade não encontrada</p>
              )}
            </CardContent>
          </Card>

          {/* Contradictions */}
          {report.contradictions && report.contradictions.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Contradições detectadas:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {report.contradictions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações de Correção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={createProfile} disabled={isLoading || !report.auth_user || !!report.profile} className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Criar/Conciliar Profile
              </Button>
              <Button onClick={resetPassword} disabled={isLoading || !report.auth_user} variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Resetar Senha
              </Button>
              <Button onClick={resendCredentials} disabled={isLoading || !report.profile} variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Reenviar Credenciais
              </Button>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          {report.audit_logs && report.audit_logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Últimos Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {report.audit_logs.slice(0, 5).map((log, i) => (
                    <div key={i} className="p-2 bg-muted rounded">
                      <div><strong>{log.action}</strong> - {new Date(log.created_at).toLocaleString()}</div>
                      {log.details && <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(log.details, null, 2)}</pre>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function generateStrongPassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
