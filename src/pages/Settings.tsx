import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, Bell, Palette, Settings as SettingsIcon, Calendar } from "lucide-react";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { useTheme } from "next-themes";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { PasswordChange } from "@/components/settings/PasswordChange";
import { QuoteApprovalSettings } from "@/components/settings/QuoteApprovalSettings";
import { QuoteReminderSettings } from "@/components/settings/QuoteReminderSettings";
import { VisitSettings } from "@/components/settings/VisitSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function Settings() {
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
  const { client, isLoading: clientLoading } = useSupabaseCurrentClient();
  const { setTheme } = useTheme();

  // Local state for form data (apenas dados do usuário)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Sync with settings when loaded
  useEffect(() => {
    if (settings && currentUser) {
      setProfileData({
        name: settings.display_name || currentUser.user_metadata?.name || '',
        email: currentUser.email || '',
        phone: settings.phone || ''
      });
    }
  }, [settings, currentUser]);

  const handleSaveProfile = async () => {
    const success = await updateProfile({
      display_name: profileData.name,
      phone: profileData.phone
    });

    // Update email if changed
    if (profileData.email !== currentUser?.email && profileData.email) {
      await updateUserEmail(profileData.email);
    }
  };

  const handleSaveNotifications = async () => {
    if (settings) {
      await updateNotifications(settings.notifications);
    }
  };

  const handleSavePreferences = async () => {
    if (settings) {
      await updatePreferences(settings.preferences);
    }
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    await updateAvatar(avatarUrl);
  };

  if (isLoading || clientLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas configurações de conta e preferências do sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Aprovações
          </TabsTrigger>
          <TabsTrigger value="visits" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Visitas
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>
                  Suas informações pessoais e de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AvatarUpload
                  currentAvatarUrl={settings?.avatar_url}
                  userName={profileData.name}
                  onAvatarChange={handleAvatarChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Seu Nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Danilo Côrtes Sales"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Seu E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Seu Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Perfil de Acesso</Label>
                    <Input
                      id="role"
                      value={currentUser?.user_metadata?.role || 'Usuário'}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Entre em contato com o administrador para alterar seu perfil
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile}>
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Dados da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações do cliente/condomínio vinculado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      value={client?.name || 'Não vinculado'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-cnpj">CNPJ</Label>
                    <Input
                      id="company-cnpj"
                      value={client?.cnpj || '-'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">E-mail Corporativo</Label>
                    <Input
                      id="company-email"
                      value={client?.email || '-'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-plan">Plano Atual</Label>
                    <Input
                      id="company-plan"
                      value={client?.subscription_plan_id || 'Não definido'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <Badge variant="outline" className="mt-4">
                  Para alterar dados da empresa, entre em contato com o suporte ou administrador
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <PasswordChange />
            
            <Card>
              <CardHeader>
                <CardTitle>Autenticação de Dois Fatores</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS</p>
                    <p className="text-sm text-muted-foreground">
                      Receba códigos de verificação por SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings?.two_factor_enabled || false}
                    onCheckedChange={(checked) => toggleTwoFactor(checked, 'sms')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como e quando deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Canais de Notificação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">E-mail</p>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações por e-mail
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.email || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            email: checked
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações por WhatsApp
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.whatsapp || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            whatsapp: checked
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tipos de Notificação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Novas Cotações</p>
                      <p className="text-sm text-muted-foreground">
                        Quando uma nova cotação for criada
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.newQuotes || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            newQuotes: checked
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Aprovações</p>
                      <p className="text-sm text-muted-foreground">
                        Quando uma aprovação for solicitada
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.approvals || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            approvals: checked
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pagamentos</p>
                      <p className="text-sm text-muted-foreground">
                        Quando um pagamento for processado
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.payments || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            payments: checked
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Estoque Baixo</p>
                      <p className="text-sm text-muted-foreground">
                        Quando um produto estiver com estoque baixo
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.lowStock || false}
                      onCheckedChange={(checked) => {
                        if (settings) {
                          updateNotifications({
                            ...settings.notifications,
                            lowStock: checked
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval">
          <div className="space-y-6">
            <QuoteApprovalSettings />
            <QuoteReminderSettings />
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>
                Configure as preferências gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select 
                    value={settings?.preferences.language || 'pt-BR'} 
                    onValueChange={(value) => {
                      if (settings) {
                        updatePreferences({
                          ...settings.preferences,
                          language: value
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    value={settings?.preferences.timezone || 'America/Sao_Paulo'} 
                    onValueChange={(value) => {
                      if (settings) {
                        updatePreferences({
                          ...settings.preferences,
                          timezone: value
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select 
                    value={settings?.preferences.currency || 'BRL'} 
                    onValueChange={(value) => {
                      if (settings) {
                        updatePreferences({
                          ...settings.preferences,
                          currency: value
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    value={settings?.preferences.theme || 'light'} 
                    onValueChange={(value) => {
                      // 1. Aplicar tema imediatamente (feedback visual instantâneo)
                      setTheme(value);
                      
                      // 2. Salvar no banco (persistir para próximos logins)
                      if (settings) {
                        updatePreferences({
                          ...settings.preferences,
                          theme: value
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
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