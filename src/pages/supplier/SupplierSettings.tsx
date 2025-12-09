import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Bell, Palette, Settings as SettingsIcon, Building2, Package, Shield, Star, Landmark, CheckCircle, AlertCircle, Pencil, X, Loader2 } from "lucide-react";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { PasswordChange } from "@/components/settings/PasswordChange";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Helper function to detect PIX key type
function detectPixKeyType(pixKey: string): string {
  if (!pixKey) return 'Desconhecido';
  
  const cleaned = pixKey.replace(/\D/g, '');
  
  // CPF: 11 digits
  if (/^\d{11}$/.test(cleaned) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(pixKey)) {
    return 'CPF';
  }
  
  // CNPJ: 14 digits
  if (/^\d{14}$/.test(cleaned) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(pixKey)) {
    return 'CNPJ';
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey)) {
    return 'E-mail';
  }
  
  // Phone (Brazilian format)
  if (/^\+?55?\d{10,11}$/.test(cleaned) || /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(pixKey)) {
    return 'Telefone';
  }
  
  // EVP (Random key - 32 hex characters with dashes)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(pixKey)) {
    return 'Chave Aleatória';
  }
  
  return 'Outro';
}

function SupplierSettings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  
  const { 
    settings, 
    currentUser, 
    isLoading, 
    updateProfile, 
    updateNotifications, 
    updatePreferences, 
    updateAvatar,
    toggleTwoFactor 
  } = useSupabaseSettings();
  
  const { updateUserEmail } = useSupabaseAuth();

  // Local state for form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const [supplierData, setSupplierData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: null,
    specialties: [],
    business_info: {},
    asaas_wallet_id: '',
    bank_data: null as any,
    created_at: '',
    pix_key: '',
    supplier_id: ''
  });

  const [isLoadingSupplier, setIsLoadingSupplier] = useState(true);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  
  // PIX key editing state
  const [isEditingPixKey, setIsEditingPixKey] = useState(false);
  const [newPixKey, setNewPixKey] = useState('');
  const [isSavingPixKey, setIsSavingPixKey] = useState(false);

  // Load supplier data
  useEffect(() => {
    const loadSupplierData = async () => {
      if (!currentUser?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('supplier_id')
          .eq('id', currentUser.id)
          .single();

        if (profile?.supplier_id) {
          const { data: supplier, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', profile.supplier_id)
            .single();

          if (error) throw error;

          if (supplier) {
            setSupplierData({
              name: supplier.name || '',
              cnpj: supplier.cnpj || '',
              phone: supplier.phone || '',
              whatsapp: supplier.whatsapp || '',
              email: supplier.email || '',
              website: supplier.website || '',
              address: supplier.address || null,
              specialties: supplier.specialties || [],
              business_info: supplier.business_info || {},
              asaas_wallet_id: supplier.asaas_wallet_id || '',
              bank_data: supplier.bank_data || null,
              created_at: supplier.created_at || '',
              pix_key: supplier.pix_key || '',
              supplier_id: supplier.id
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do fornecedor:', error);
        toast.error('Erro ao carregar dados do fornecedor');
      } finally {
        setIsLoadingSupplier(false);
      }
    };

    loadSupplierData();
  }, [currentUser?.id]);

  // Sync with settings when loaded
  useEffect(() => {
    if (settings && currentUser) {
      setProfileData({
        name: settings.display_name || currentUser.user_metadata?.name || '',
        email: currentUser.email || '',
        phone: settings.phone || '',
        company: settings.company_name || ''
      });
    }
  }, [settings, currentUser]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileData);
      
      if (profileData.email !== currentUser?.email) {
        await updateUserEmail(profileData.email);
      }
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleSaveSupplier = async () => {
    if (!currentUser?.id) return;

    setIsSavingSupplier(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', currentUser.id)
        .single();

      if (profile?.supplier_id) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: supplierData.name,
            phone: supplierData.phone,
            whatsapp: supplierData.whatsapp,
            website: supplierData.website,
            address: supplierData.address,
            specialties: supplierData.specialties,
            business_info: supplierData.business_info,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.supplier_id);

        if (error) throw error;
        toast.success('Dados da empresa atualizados com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      toast.error('Erro ao atualizar dados da empresa');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleSaveNotifications = async (notifications: any) => {
    try {
      await updateNotifications(notifications);
      toast.success('Configurações de notificação atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
      toast.error('Erro ao atualizar notificações');
    }
  };

  const handleSavePreferences = async (preferences: any) => {
    try {
      await updatePreferences(preferences);
      toast.success('Preferências atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      toast.error('Erro ao atualizar preferências');
    }
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    try {
      await updateAvatar(avatarUrl);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      toast.error('Erro ao atualizar avatar');
    }
  };

  if (isLoading || isLoadingSupplier) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie suas configurações e preferências</p>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas configurações e preferências</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="bank">
            <Landmark className="h-4 w-4 mr-2" />
            Dados Bancários
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais de usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-shrink-0">
                  <AvatarUpload
                    currentAvatarUrl={settings?.avatar_url}
                    onAvatarChange={handleAvatarChange}
                  />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="seu@email.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input
                        id="company"
                        value={profileData.company}
                        onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
                    Salvar Perfil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>
                Informações comerciais e de contato da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <Input
                    id="company-name"
                    value={supplierData.name}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Razão social da empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={supplierData.cnpj}
                    disabled
                    className="bg-muted"
                    placeholder="XX.XXX.XXX/XXXX-XX"
                  />
                  <p className="text-xs text-muted-foreground">CNPJ não pode ser alterado</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Telefone Comercial</Label>
                  <Input
                    id="company-phone"
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 3333-3333"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={supplierData.whatsapp}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-email">E-mail Comercial</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={supplierData.email}
                    disabled
                    className="bg-muted"
                    placeholder="contato@empresa.com"
                  />
                  <p className="text-xs text-muted-foreground">E-mail comercial não pode ser alterado</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={supplierData.website}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.empresa.com"
                  />
                </div>
              </div>

              {supplierData.specialties && supplierData.specialties.length > 0 && (
                <div className="space-y-2">
                  <Label>Especialidades</Label>
                  <div className="flex flex-wrap gap-2">
                    {supplierData.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleSaveSupplier} 
                disabled={isSavingSupplier}
                className="w-full sm:w-auto"
              >
                {isSavingSupplier ? 'Salvando...' : 'Salvar Dados da Empresa'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Data Tab */}
        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Dados para Recebimento
              </CardTitle>
              <CardDescription>
                Configure sua chave PIX para receber pagamentos. Quando uma entrega for confirmada, o valor será transferido automaticamente para sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PIX Key Section */}
              {(supplierData.pix_key || supplierData.bank_data?.pix_key) && !isEditingPixKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Chave PIX Configurada</span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          Você está pronto para receber transferências.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sua Chave PIX</Label>
                      <Badge variant="secondary" className="text-xs">
                        {detectPixKeyType(supplierData.pix_key || supplierData.bank_data?.pix_key)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={supplierData.pix_key || supplierData.bank_data?.pix_key || ''} 
                        disabled 
                        className="bg-muted font-mono" 
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          setNewPixKey(supplierData.pix_key || supplierData.bank_data?.pix_key || '');
                          setIsEditingPixKey(true);
                        }}
                        title="Alterar Chave PIX"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show bank account details if available */}
                  {supplierData.bank_data?.account_number && (
                    <div className="pt-4 border-t">
                      <Label className="text-muted-foreground text-sm mb-3 block">Dados Bancários Adicionais</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Banco</Label>
                          <Input value={supplierData.bank_data.bank_code} disabled className="bg-muted h-8 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Agência</Label>
                          <Input value={supplierData.bank_data.agency} disabled className="bg-muted h-8 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Conta</Label>
                          <Input value={supplierData.bank_data.account_number} disabled className="bg-muted h-8 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Titular</Label>
                          <Input value={supplierData.bank_data.account_holder_name} disabled className="bg-muted h-8 text-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : isEditingPixKey ? (
                // Edit PIX Key Form
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-medium">Alterar Chave PIX</Label>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setIsEditingPixKey(false);
                          setNewPixKey('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-pix-key">Nova Chave PIX</Label>
                        <Input
                          id="new-pix-key"
                          value={newPixKey}
                          onChange={(e) => setNewPixKey(e.target.value)}
                          placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                          className="font-mono"
                        />
                        {newPixKey && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Tipo detectado:</span>
                            <Badge variant="outline">{detectPixKeyType(newPixKey)}</Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsEditingPixKey(false);
                            setNewPixKey('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={async () => {
                            if (!newPixKey.trim() || !supplierData.supplier_id) {
                              toast.error('Informe uma chave PIX válida');
                              return;
                            }
                            
                            setIsSavingPixKey(true);
                            try {
                              const { error } = await supabase
                                .from('suppliers')
                                .update({ 
                                  pix_key: newPixKey.trim(),
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', supplierData.supplier_id);
                              
                              if (error) throw error;
                              
                              setSupplierData(prev => ({ ...prev, pix_key: newPixKey.trim() }));
                              setIsEditingPixKey(false);
                              setNewPixKey('');
                              toast.success('Chave PIX atualizada com sucesso!');
                            } catch (error) {
                              console.error('Erro ao atualizar chave PIX:', error);
                              toast.error('Erro ao atualizar chave PIX');
                            } finally {
                              setIsSavingPixKey(false);
                            }
                          }}
                          disabled={isSavingPixKey || !newPixKey.trim()}
                        >
                          {isSavingPixKey ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Nova Chave'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // No PIX Key - Show form to add
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Chave PIX não configurada</span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      Configure sua chave PIX para receber pagamentos quando as entregas forem confirmadas.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pix-key">Chave PIX</Label>
                    <Input
                      id="pix-key"
                      value={newPixKey}
                      onChange={(e) => setNewPixKey(e.target.value)}
                      placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                      className="font-mono"
                    />
                    {newPixKey && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Tipo detectado:</span>
                        <Badge variant="outline">{detectPixKeyType(newPixKey)}</Badge>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      if (!newPixKey.trim() || !supplierData.supplier_id) {
                        toast.error('Informe uma chave PIX válida');
                        return;
                      }
                      
                      setIsSavingPixKey(true);
                      try {
                        const { error } = await supabase
                          .from('suppliers')
                          .update({ 
                            pix_key: newPixKey.trim(),
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', supplierData.supplier_id);
                        
                        if (error) throw error;
                        
                        setSupplierData(prev => ({ ...prev, pix_key: newPixKey.trim() }));
                        setNewPixKey('');
                        toast.success('Chave PIX cadastrada com sucesso!');
                      } catch (error) {
                        console.error('Erro ao cadastrar chave PIX:', error);
                        toast.error('Erro ao cadastrar chave PIX');
                      } finally {
                        setIsSavingPixKey(false);
                      }
                    }}
                    disabled={isSavingPixKey || !newPixKey.trim()}
                  >
                    {isSavingPixKey ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Cadastrar Chave PIX'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie sua senha e configurações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordChange />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Autenticação de Dois Fatores</CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Status da 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.two_factor_enabled ? 'Ativada' : 'Desativada'}
                  </p>
                </div>
                <Switch
                  checked={settings?.two_factor_enabled || false}
                  onCheckedChange={(enabled) => toggleTwoFactor(enabled, 'email')}
                />
              </div>
              
              {settings?.two_factor_enabled && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Sua conta está protegida com autenticação de dois fatores
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações por E-mail</p>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações importantes por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.email || false}
                    onCheckedChange={(enabled) => 
                      handleSaveNotifications({ 
                        ...settings, 
                        notifications: { ...settings?.notifications, email: enabled } 
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações de Novas Cotações</p>
                    <p className="text-sm text-muted-foreground">
                      Seja notificado quando receber novas solicitações de cotação
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.newQuotes || true}
                    onCheckedChange={(enabled) => 
                      handleSaveNotifications({ 
                        ...settings, 
                        notifications: { ...settings?.notifications, newQuotes: enabled } 
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações de Pagamentos</p>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas sobre recebimentos e pagamentos
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.payments || true}
                    onCheckedChange={(enabled) => 
                      handleSaveNotifications({ 
                        ...settings, 
                        notifications: { ...settings?.notifications, payments: enabled } 
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações de Entregas</p>
                    <p className="text-sm text-muted-foreground">
                      Alertas sobre agendamentos e confirmações de entrega
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications?.email || true}
                    onCheckedChange={(enabled) => 
                      handleSaveNotifications({ 
                        ...settings, 
                        notifications: { ...settings?.notifications, email: enabled } 
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>
                Personalize a aparência e o comportamento do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={settings?.preferences?.language || 'pt-BR'}
                    onValueChange={(value) => 
                      handleSavePreferences({ 
                        ...settings, 
                        preferences: { ...settings?.preferences, language: value } 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select
                    value={settings?.preferences?.timezone || 'America/Sao_Paulo'}
                    onValueChange={(value) => 
                      handleSavePreferences({ 
                        ...settings, 
                        preferences: { ...settings?.preferences, timezone: value } 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select
                    value={settings?.preferences?.currency || 'BRL'}
                    onValueChange={(value) => 
                      handleSavePreferences({ 
                        ...settings, 
                        preferences: { ...settings?.preferences, currency: value } 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (R$)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={settings?.preferences?.theme || 'system'}
                    onValueChange={(value) => 
                      handleSavePreferences({ 
                        ...settings, 
                        preferences: { ...settings?.preferences, theme: value } 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SupplierSettings;