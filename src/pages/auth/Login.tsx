import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detectedUserType, setDetectedUserType] = useState<'client' | 'supplier' | 'admin' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  // Auto redirect when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  // Detectar tipo de usuário baseado no email
  const detectUserType = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setDetectedUserType(null);
      return;
    }

    setIsDetecting(true);
    setError('');

    try {
      // Primeiro verificar se é admin (baseado no domínio ou email específico)
      if (emailValue.includes('admin@') || emailValue.includes('@quotemaster.com')) {
        setDetectedUserType('admin');
        setIsDetecting(false);
        return;
      }

      // Verificar nas tabelas de usuários para determinar o tipo
      const [{ data: suppliers }, { data: clients }] = await Promise.all([
        supabase.from('suppliers').select('email').eq('email', emailValue).single(),
        supabase.from('clients').select('email').eq('email', emailValue).single()
      ]);

      if (suppliers) {
        setDetectedUserType('supplier');
      } else if (clients) {
        setDetectedUserType('client');
      } else {
        // Se não encontrou, verificar na tabela profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', emailValue)
          .single();

        if (profile) {
          setDetectedUserType(profile.role === 'admin' ? 'admin' : 'client');
        } else {
          // Default para cliente se não encontrar
          setDetectedUserType('client');
        }
      }
    } catch (error) {
      console.error('Erro ao detectar tipo de usuário:', error);
      // Em caso de erro, assume cliente
      setDetectedUserType('client');
    } finally {
      setIsDetecting(false);
    }
  };

  // Detectar tipo quando email muda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (email) {
        detectUserType(email);
      } else {
        setDetectedUserType(null);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [email]);

  const getUserTypeInfo = () => {
    if (!detectedUserType) {
      return { icon: null, label: '', description: 'Digite seu email para continuar' };
    }

    switch (detectedUserType) {
      case 'client':
        return { 
          icon: Building2, 
          label: 'Cliente/Condomínio', 
          description: 'Acesso para gestores de empresas e condomínios'
        };
      case 'supplier':
        return { 
          icon: Users, 
          label: 'Fornecedor', 
          description: 'Acesso para fornecedores e prestadores de serviços'
        };
      case 'admin':
        return { 
          icon: User, 
          label: 'Administrador', 
          description: 'Acesso administrativo da plataforma'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Traduzir erros comuns para português
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message.includes('Too many requests')) {
          setError('Muitas tentativas de login. Tente novamente em alguns minutos.');
        } else {
          setError(error.message);
        }
        return;
      }

      // Verificar se o usuário tem um perfil associado
      if (data.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, name, email, role, status, force_password_change')
          .eq('auth_user_id', data.user.id)
          .single();

        // Se o usuário tem perfil na tabela users mas está com force_password_change
        if (userProfile?.force_password_change) {
          toast.info('Você precisa alterar sua senha temporária no primeiro acesso.');
          // Pode redirecionar para tela de mudança de senha ou permitir login
        }

        // Se não tem perfil na tabela users, verificar se existe no profiles
        if (!userProfile) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            setError('Usuário não encontrado no sistema. Entre em contato com o administrador.');
            await supabase.auth.signOut();
            return;
          }
        }
      }

      toast.success('Login realizado com sucesso!');
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Funcionalidade removida - detecção automática por email apenas
  };

  const userTypeInfo = getUserTypeInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">QuoteMaster Pro</h1>
          <p className="text-muted-foreground mt-2">Sistema de gestão de cotações</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Fazer Login</CardTitle>
            <CardDescription className="text-center">
              Digite seu email e o sistema detectará automaticamente seu tipo de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Indicador de tipo de usuário detectado */}
            {detectedUserType && userTypeInfo.icon && (
              <div className="flex items-center justify-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <userTypeInfo.icon className="h-5 w-5 text-primary mr-2" />
                <div className="text-center">
                  <p className="font-medium text-primary">{userTypeInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{userTypeInfo.description}</p>
                </div>
              </div>
            )}

            {isDetecting && (
              <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Detectando tipo de usuário...</span>
              </div>
            )}

            {!detectedUserType && !isDetecting && email && (
              <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                {userTypeInfo.description}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isDetecting}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Não tem uma conta? 
              </span>
              <Link 
                to="/auth/register" 
                className="text-sm text-primary hover:underline ml-1"
              >
                Cadastre-se
              </Link>
            </div>

            {/* Dados de teste baseados no tipo detectado */}
            {detectedUserType && (
              <div className="mt-6 text-xs text-muted-foreground text-center border-t pt-4">
                <p className="mb-2 font-medium">Dados para teste ({userTypeInfo.label}):</p>
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  {detectedUserType === 'admin' && (
                    <>
                      <p><strong>Email:</strong> admin@quotemaster.com</p>
                      <p><strong>Senha:</strong> 123456</p>
                    </>
                  )}
                  {detectedUserType === 'client' && (
                    <>
                      <p><strong>Email:</strong> cliente@condominio.com</p>
                      <p><strong>Senha:</strong> 123456</p>
                    </>
                  )}
                  {detectedUserType === 'supplier' && (
                    <>
                      <p><strong>Email:</strong> fornecedor@empresa.com</p>
                      <p><strong>Senha:</strong> 123456</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          © 2025 QuoteMaster Pro. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;