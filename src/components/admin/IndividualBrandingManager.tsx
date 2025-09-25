import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Truck, Edit, Trash2, Plus, Save, 
  RotateCcw, Palette, Eye, Settings2, Upload 
} from 'lucide-react';

interface BrandingSettings {
  id?: string;
  companyName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  loginPageTitle: string;
  footerText: string;
  customCss: string;
}

interface Client {
  id: string;
  name: string;
  company_name?: string;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
}

const defaultSettings: BrandingSettings = {
  companyName: 'Sistema de Cotações',
  logo: '/placeholder.svg',
  favicon: '/favicon.ico',
  primaryColor: '#003366',
  secondaryColor: '#F5F5F5',
  accentColor: '#0066CC',
  loginPageTitle: 'Bem-vindo ao Sistema de Cotações',
  footerText: '© 2025 Sistema de Cotações. Todos os direitos reservados.',
  customCss: ''
};

export const IndividualBrandingManager = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'client' | 'supplier'; id: string; name: string } | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Carregar clientes e fornecedores
  useEffect(() => {
    loadClientsAndSuppliers();
  }, []);

  const loadClientsAndSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, company_name, status')
        .eq('status', 'active')
        .order('name');

      if (clientsError) throw clientsError;

      // Carregar fornecedores
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (suppliersError) throw suppliersError;

      setClients(clientsData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Erro ao carregar entidades:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes e fornecedores",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrandingSettings = async (entityType: 'client' | 'supplier', entityId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .eq(entityType === 'client' ? 'client_id' : 'supplier_id', entityId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setBrandingSettings({
          id: data.id,
          companyName: data.company_name || defaultSettings.companyName,
          logo: data.logo_url || defaultSettings.logo,
          favicon: data.favicon_url || defaultSettings.favicon,
          primaryColor: data.primary_color || defaultSettings.primaryColor,
          secondaryColor: data.secondary_color || defaultSettings.secondaryColor,
          accentColor: data.accent_color || defaultSettings.accentColor,
          loginPageTitle: data.login_page_title || defaultSettings.loginPageTitle,
          footerText: data.footer_text || defaultSettings.footerText,
          customCss: data.custom_css || defaultSettings.customCss
        });
      } else {
        setBrandingSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setBrandingSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBrandingSettings = async () => {
    if (!selectedEntity) return;

    try {
      setIsSaving(true);
      
      const settingsData = {
        company_name: brandingSettings.companyName,
        logo_url: brandingSettings.logo,
        favicon_url: brandingSettings.favicon,
        primary_color: brandingSettings.primaryColor,
        secondary_color: brandingSettings.secondaryColor,
        accent_color: brandingSettings.accentColor,
        login_page_title: brandingSettings.loginPageTitle,
        footer_text: brandingSettings.footerText,
        custom_css: brandingSettings.customCss,
        updated_at: new Date().toISOString()
      };

      if (brandingSettings.id) {
        // Atualizar existente
        const { error } = await supabase
          .from('branding_settings')
          .update(settingsData)
          .eq('id', brandingSettings.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('branding_settings')
          .insert({
            ...settingsData,
            [selectedEntity.type === 'client' ? 'client_id' : 'supplier_id']: selectedEntity.id
          });

        if (error) throw error;
      }

      console.log('🎨 [INDIVIDUAL-BRANDING] Configurações salvas com sucesso');

      toast({
        title: "Sucesso!",
        description: `Branding de ${selectedEntity.name} salvo com sucesso.`
      });

      // Recarregar configurações de branding
      if (window.parent && window.parent.location) {
        // Se estivermos em um iframe, recarregar a página pai
        window.parent.location.reload();
      } else {
        // Senão, recarregar a página atual
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de branding",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBrandingSettings = async () => {
    if (!selectedEntity || !brandingSettings.id) return;

    if (!confirm(`Tem certeza de que deseja remover o branding personalizado de ${selectedEntity.name}? Isso fará com que use o branding global.`)) {
      return;
    }

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('branding_settings')
        .delete()
        .eq('id', brandingSettings.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Branding personalizado de ${selectedEntity.name} removido. Agora usará o branding global.`
      });

      // Recarregar configurações de branding
      if (window.parent && window.parent.location) {
        // Se estivermos em um iframe, recarregar a página pai
        window.parent.location.reload();
      } else {
        // Senão, recarregar a página atual
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover configurações de branding",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'logo' | 'favicon'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload para o storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${selectedEntity?.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`branding/${fileName}`, file);

      if (error) throw error;

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from('attachments')
        .getPublicUrl(`branding/${fileName}`);

      setBrandingSettings(prev => ({ 
        ...prev, 
        [type]: publicUrl.publicUrl 
      }));

      toast({
        title: "Sucesso!",
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} carregado com sucesso.`
      });

    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar ${type === 'logo' ? 'logo' : 'favicon'}.`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openBrandingDialog = (type: 'client' | 'supplier', id: string, name: string) => {
    setSelectedEntity({ type, id, name });
    loadBrandingSettings(type, id);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Clientes ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{client.name}</div>
                    {client.company_name && (
                      <div className="text-sm text-muted-foreground">{client.company_name}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBrandingDialog('client', client.id, client.name)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Branding
                  </Button>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum cliente ativo encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fornecedores ({suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBrandingDialog('supplier', supplier.id, supplier.name)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Branding
                  </Button>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum fornecedor ativo encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Configuração */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding: {selectedEntity?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedEntity && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identidade */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Identidade
                  </h4>
                  
                  <div>
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={brandingSettings.companyName}
                      onChange={(e) => setBrandingSettings(prev => ({ 
                        ...prev, 
                        companyName: e.target.value 
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Logo da Empresa</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logo-upload-modal"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload-modal')?.click()}
                        disabled={isSaving || isUploading}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(brandingSettings.logo, '_blank')}
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cores */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cores
                  </h4>
                  
                  {[
                    { key: 'primaryColor', label: 'Primária' },
                    { key: 'secondaryColor', label: 'Secundária' },
                    { key: 'accentColor', label: 'Destaque' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex gap-2">
                      <Input
                        type="color"
                        value={brandingSettings[key as keyof BrandingSettings] as string}
                        onChange={(e) => setBrandingSettings(prev => ({ 
                          ...prev, 
                          [key]: e.target.value 
                        }))}
                        className="w-16 h-8 p-1"
                      />
                      <Input
                        value={brandingSettings[key as keyof BrandingSettings] as string}
                        onChange={(e) => setBrandingSettings(prev => ({ 
                          ...prev, 
                          [key]: e.target.value 
                        }))}
                        placeholder={label}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Textos */}
              <div className="space-y-4">
                <h4 className="font-semibold">Textos Personalizados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título da Página de Login</Label>
                    <Input
                      value={brandingSettings.loginPageTitle}
                      onChange={(e) => setBrandingSettings(prev => ({ 
                        ...prev, 
                        loginPageTitle: e.target.value 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Texto do Rodapé</Label>
                    <Input
                      value={brandingSettings.footerText}
                      onChange={(e) => setBrandingSettings(prev => ({ 
                        ...prev, 
                        footerText: e.target.value 
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Preview</h4>
                <div 
                  className="rounded-lg p-4 text-white"
                  style={{ backgroundColor: brandingSettings.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' ? (
                      <img 
                        src={brandingSettings.logo} 
                        alt="Logo" 
                        className="h-8 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="h-8 w-16 bg-white/20 rounded flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <h5 className="font-bold">{brandingSettings.companyName}</h5>
                      <p className="text-sm opacity-90">{brandingSettings.loginPageTitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-between pt-4">
                <div>
                  {brandingSettings.id && (
                    <Button
                      variant="destructive"
                      onClick={deleteBrandingSettings}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover Branding
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveBrandingSettings}
                    disabled={isSaving || isUploading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};