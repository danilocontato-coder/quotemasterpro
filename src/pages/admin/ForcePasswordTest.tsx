import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserRecord {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  force_password_change: boolean;
}

export default function ForcePasswordTest() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, email, name, force_password_change')
        .order('email');

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar usuários.",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleForcePasswordChange = async (enable: boolean) => {
    if (!selectedUserId) {
      toast({
        title: "Atenção",
        description: "Selecione um usuário primeiro.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (!selectedUser) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar flag force_password_change
      const { error: updateError } = await supabase
        .from('users')
        .update({ force_password_change: enable })
        .eq('id', selectedUserId);

      if (updateError) throw updateError;

      // Log de auditoria
      await supabase.from('audit_logs').insert({
        user_id: selectedUser.auth_user_id,
        action: enable ? 'FORCE_PASSWORD_CHANGE_ENABLED' : 'FORCE_PASSWORD_CHANGE_DISABLED',
        entity_type: 'users',
        entity_id: selectedUserId,
        panel_type: 'admin',
        details: {
          email: selectedUser.email,
          name: selectedUser.name,
          test_mode: true
        }
      });

      toast({
        title: enable ? "Troca de senha ativada" : "Troca de senha desativada",
        description: `O usuário ${selectedUser.email} ${enable ? 'será obrigado' : 'não será mais obrigado'} a trocar a senha no próximo login.`,
      });

      // Atualizar lista
      await fetchUsers();
    } catch (error: any) {
      console.error('Erro ao alterar flag:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a configuração.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Teste de Mudança Forçada de Senha
        </h1>
        <p className="text-muted-foreground mt-2">
          Ferramenta de administração para testar o fluxo de troca obrigatória de senha
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Usuário</CardTitle>
          <CardDescription>
            Escolha um usuário para ativar ou desativar a troca forçada de senha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{user.email} - {user.name}</span>
                        {user.force_password_change && (
                          <Badge variant="destructive" className="ml-2">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Senha obrigatória
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUser && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status Atual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nome:</span>
                      <span className="text-sm font-medium">{selectedUser.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Troca Forçada:</span>
                      {selectedUser.force_password_change ? (
                        <Badge variant="destructive">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          ATIVA
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Inativa
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleForcePasswordChange(true)}
                  disabled={!selectedUserId || isLoading || selectedUser?.force_password_change}
                  variant="destructive"
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="mr-2 h-4 w-4" />
                  )}
                  Ativar Troca Forçada
                </Button>
                <Button
                  onClick={() => handleForcePasswordChange(false)}
                  disabled={!selectedUserId || isLoading || !selectedUser?.force_password_change}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Desativar Troca Forçada
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Como Testar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Selecione um usuário de teste na lista acima</li>
            <li>Clique em "Ativar Troca Forçada"</li>
            <li>Faça logout da conta atual</li>
            <li>Faça login com o usuário de teste</li>
            <li>O modal de troca de senha deve aparecer automaticamente</li>
            <li>Após trocar a senha, a flag será desativada automaticamente</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            <strong>Nota:</strong> Esta ferramenta é apenas para testes. Todas as ações são registradas no audit_logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
