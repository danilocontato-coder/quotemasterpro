import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SupplierAuth = () => {
  const { quoteId, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) throw error;

      // Verificar se é fornecedor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, supplier_id')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== 'supplier') {
        toast({
          title: "Erro",
          description: "Esta conta não é de fornecedor",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        return;
      }

      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!"
      });

      // Redirecionar para resposta da cotação
      navigate(`/supplier/quote/${quoteId}/response/${token}`);
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast({
        title: "Erro", 
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro",
        description: "Senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/supplier/quote/${quoteId}/response/${token}`,
          data: {
            name: registerData.name,
            role: 'supplier'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Criar fornecedor
        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({
            name: registerData.name,
            cnpj: registerData.cnpj,
            email: registerData.email,
            phone: registerData.phone,
            city: registerData.city,
            state: registerData.state,
            status: 'active'
          })
          .select('id')
          .single();

        if (supplierError) throw supplierError;

        // Atualizar perfil do usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            supplier_id: supplier.id
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        toast({
          title: "Sucesso",
          description: "Cadastro realizado com sucesso! Verifique seu email.",
        });

        // Redirecionar para resposta da cotação
        navigate(`/supplier/quote/${quoteId}/response/${token}`);
      }
      
    } catch (error: any) {
      console.error('Register error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">QuoteMaster Pro</h1>
          <p className="text-muted-foreground">Acesso para Fornecedores</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Responder Cotação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="loginEmail">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginEmail"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        placeholder="seu@email.com"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="loginPassword">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginPassword"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        placeholder="Sua senha"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="registerName">Nome da Empresa *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerName"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                        placeholder="Razão social"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerCnpj">CNPJ</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerCnpj"
                        value={registerData.cnpj}
                        onChange={(e) => setRegisterData({...registerData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerEmail">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerEmail"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        placeholder="contato@empresa.com"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerPhone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerPhone"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="registerCity">Cidade</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="registerCity"
                          value={registerData.city}
                          onChange={(e) => setRegisterData({...registerData, city: e.target.value})}
                          placeholder="Cidade"
                          className="pl-10"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="registerState">Estado</Label>
                      <Input
                        id="registerState"
                        value={registerData.state}
                        onChange={(e) => setRegisterData({...registerData, state: e.target.value})}
                        placeholder="UF"
                        disabled={loading}
                        maxLength={2}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerPassword">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerPassword"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        placeholder="Confirme sua senha"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Cadastrando...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Ao continuar, você concorda com nossos termos de uso.</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierAuth;