import { DebugAuthPanel } from '@/components/admin/debug/DebugAuthPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

export default function DebugAuth() {
  const { user, session, isLoading } = useAuth();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) return;
      setRolesLoading(true);
      const { data } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      setUserRoles(data || []);
      setRolesLoading(false);
    };
    fetchRoles();
  }, [user?.id]);

  const testLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@quotemaster.com',
      password: 'admin123'
    });
    if (error) console.error('Login error:', error);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Debug de Autenticação</h1>
        <p className="text-muted-foreground">
          Diagnóstico completo de Auth, Profiles e sincronização
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔍 Status Atual do Superadmin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Autenticado:</strong> 
              <Badge variant={session ? "default" : "destructive"} className="ml-2">
                {session ? "SIM" : "NÃO"}
              </Badge>
            </div>
            <div>
              <strong>Loading:</strong> 
              <Badge variant={isLoading ? "secondary" : "outline"} className="ml-2">
                {isLoading ? "SIM" : "NÃO"}
              </Badge>
            </div>
            <div>
              <strong>User ID:</strong> 
              <code className="ml-2 text-xs">{user?.id || 'null'}</code>
            </div>
            <div>
              <strong>Email:</strong> 
              <span className="ml-2">{user?.email || 'null'}</span>
            </div>
            <div>
              <strong>Role (Profile):</strong> 
              <Badge variant="outline" className="ml-2">{user?.role || 'null'}</Badge>
            </div>
            <div>
              <strong>Roles (Tabela):</strong> 
              {rolesLoading ? (
                <span className="ml-2">Carregando...</span>
              ) : (
                <div className="ml-2 flex gap-2 flex-wrap">
                  {userRoles.map(r => (
                    <Badge key={r.id} variant="secondary">{r.role}</Badge>
                  ))}
                  {userRoles.length === 0 && <span className="text-muted-foreground">Nenhum</span>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={testLogin}>
              🔐 Testar Login como Admin
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <DebugAuthPanel />
    </div>
  );
}
