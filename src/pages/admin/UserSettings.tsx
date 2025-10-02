import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Bell } from "lucide-react";
import { PasswordChange } from "@/components/settings/PasswordChange";
import { Switch } from "@/components/ui/switch";

export default function UserSettings() {
  const { toast } = useToast();
  const { currentUser, settings, isLoading, updateProfile, updateNotifications } = useSupabaseSettings();
  const { updateUserEmail } = useSupabaseAuth();
  
  const [profileData, setProfileData] = useState({
    display_name: settings?.display_name || "",
    phone: settings?.phone || "",
    company_name: settings?.company_name || ""
  });

  const [email, setEmail] = useState(currentUser?.email || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile(profileData);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email || email === currentUser?.email) {
      toast({
        title: "Email não alterado",
        description: "Digite um novo email para atualizar.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      await updateUserEmail(email);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    if (!settings) return;
    
    await updateNotifications({
      ...settings.notifications,
      [key]: value
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Conta</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais, segurança e preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
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
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize seus dados pessoais e informações de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome Completo</Label>
                <Input
                  id="display_name"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Empresa</Label>
                <Input
                  id="company_name"
                  value={profileData.company_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile}
                className="w-full sm:w-auto"
              >
                {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email da Conta</CardTitle>
              <CardDescription>
                Altere o email associado à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
                <p className="text-sm text-muted-foreground">
                  Você receberá um email de confirmação no novo endereço
                </p>
              </div>

              <Button 
                onClick={handleSaveEmail} 
                disabled={isSavingEmail || email === currentUser?.email}
                className="w-full sm:w-auto"
              >
                {isSavingEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Atualizar Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <PasswordChange />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificações</CardTitle>
              <CardDescription>
                Configure como deseja receber notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações importantes por email
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notificações por WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.whatsapp}
                  onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Novas Cotações</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre novas cotações
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.newQuotes}
                  onCheckedChange={(checked) => handleNotificationChange('newQuotes', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Aprovações</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre aprovações pendentes
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.approvals}
                  onCheckedChange={(checked) => handleNotificationChange('approvals', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Pagamentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre pagamentos
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.payments}
                  onCheckedChange={(checked) => handleNotificationChange('payments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Estoque Baixo</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas de estoque baixo
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications?.lowStock}
                  onCheckedChange={(checked) => handleNotificationChange('lowStock', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
