import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { LoginDebug } from '@/components/debug/LoginDebug';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detectedUserType, setDetectedUserType] = useState<'client' | 'supplier' | 'admin' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Auto redirect when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const redirectPath = getRoleBasedRoute(user.role);
      navigate(redirectPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Detectar tipo de usuário baseado no email - SIMPLIFICADO (sem consultas DB)
  const detectUserType = (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setDetectedUserType(null);
      return;
    }

    const domain = emailValue.split('@')[1];
    
    // Admin - emails específicos
    if (emailValue.includes('admin@') || domain === 'quotemaster.com') {
      setDetectedUserType('admin');
    }
    // Supplier - padrões comuns de fornecedores 
    else if (domain && (
      emailValue.includes('fornecedor') ||
      emailValue.includes('supplier') || 
      emailValue.includes('empresa') ||
      domain.includes('ltda') ||
      domain.includes('com.br')
    )) {
      setDetectedUserType('supplier');
    }
    // Default - cliente
    else {
      setDetectedUserType('client');
    }
  };

  // Detectar tipo quando email muda (com debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsDetecting(true);
      if (email) {
        detectUserType(email);
      } else {
        setDetectedUserType(null);
      }
      setIsDetecting(false);
    }, 300); // Debounce reduzido

    return () => clearTimeout(timeoutId);
  }, [email]);

  const getUserTypeInfo = () => {
    if (!detectedUserType) {
      return { icon: null, label: '', description: 'Digite seu email para continuar' };
    }
    
    switch (detectedUserType) {
      case 'admin':
        return {
          icon: <Users className="h-5 w-5" />,
          label: 'Administrador',
          description: 'Acesso total ao sistema'
        };
      case 'supplier':
        return {
          icon: <Building2 className="h-5 w-5" />,
          label: 'Fornecedor',
          description: 'Responder cotações e gerenciar produtos'
        };
      case 'client':
        return {
          icon: <User className="h-5 w-5" />,
          label: 'Cliente',
          description: 'Solicitar cotações e gerenciar fornecedores'
        };
      default:
        return { icon: null, label: '', description: '' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message.includes('Too many requests')) {
          setError('Muitas tentativas de login. Tente novamente em alguns minutos.');
        } else {
          setError(error.message);
        }
        return;
      }

      console.log('Login realizado com sucesso!');
      // O redirecionamento será feito automaticamente pelo useEffect do AuthContext
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-muted-foreground mt-2">Faça login para continuar</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              {userTypeInfo.description}
            </CardDescription>
            
            {/* User type indicator */}
            {detectedUserType && (
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-md">
                <div className="text-primary">
                  {userTypeInfo.icon}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{userTypeInfo.label}</div>
                  <div className="text-muted-foreground text-xs">{userTypeInfo.description}</div>
                </div>
                {isDetecting && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
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
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
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
      
      {/* Debug component */}
      <LoginDebug />
    </div>
  );
};

export default Login;