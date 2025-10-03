import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/contexts/BrandingContext';

export default function SupplierRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: brandingSettings } = useBranding();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnpj: '',
    phone: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'As senhas digitadas devem ser iguais.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Registrar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'supplier'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // 2. Criar fornecedor
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: formData.name,
          email: formData.email,
          cnpj: formData.cnpj.replace(/\D/g, ''),
          phone: formData.phone,
          city: formData.city,
          state: formData.state,
          status: 'active',
          type: 'local'
        })
        .select()
        .single();

      if (supplierError) throw supplierError;

      // 3. Atualizar profile com supplier_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          supplier_id: supplierData.id,
          onboarding_completed: true,
          tenant_type: 'supplier'
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Cadastro realizado com sucesso!',
        description: 'Você já pode fazer login e responder cotações.'
      });

      // Redirecionar para login
      navigate('/supplier/auth');

    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Não foi possível completar o cadastro.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
                <div className="bg-white rounded-lg p-2 shadow-md">
                  <img 
                    src={brandingSettings.logo} 
                    alt={brandingSettings.companyName}
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-1">{brandingSettings.companyName}</h1>
                <p className="text-primary-foreground/80 text-sm">Cadastro de Fornecedor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Cadastre-se como Fornecedor
            </CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta e começar a receber cotações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Razão social"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="contato@empresa.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Sua cidade"
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="UF"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-4">Senha de Acesso</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Mínimo 6 caracteres"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Digite a senha novamente"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Criar Conta'}
              </Button>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate('/supplier/auth')}
                  >
                    Fazer login
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
