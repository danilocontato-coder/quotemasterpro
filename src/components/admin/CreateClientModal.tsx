import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import {
  Building2,
  User,
  MapPin,
  FileText,
  Key,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  CreditCard,
  Copy
} from 'lucide-react';
import { AdminClient, ClientGroup, ClientContact, ClientDocument } from '@/hooks/useSupabaseAdminClients';

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateClient: (
    client: Omit<AdminClient, "id" | "createdAt" | "revenue" | "quotesCount">, 
    notificationOptions?: { sendByEmail?: boolean; sendByWhatsApp?: boolean }
  ) => Promise<any>;
  clientGroups: ClientGroup[];
  generateUsername: (companyName: string) => string;
  generateTemporaryPassword: () => string;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onOpenChange,
  onCreateClient,
  clientGroups,
  generateUsername,
  generateTemporaryPassword
}) => {
  const { toast } = useToast();
  const { plans } = useSupabaseSubscriptionPlans();
  const [currentTab, setCurrentTab] = useState('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    groupId: '',
    plan: 'basic',
    status: 'active' as const,
    notes: '',
    // Hierarquia
    clientType: 'direct' as 'direct' | 'administradora' | 'condominio_vinculado',
    parentClientId: ''
  });

  const [contacts, setContacts] = useState<ClientContact[]>([{
    name: '',
    email: '',
    phone: '',
    position: '',
    isPrimary: true
  }]);

  const [documents, setDocuments] = useState<ClientDocument[]>([]);

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    useTemporaryPassword: true,
    sendByEmail: true,
    sendByWhatsApp: false
  });

  const handleCompanyNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, companyName: value }));
    
    // Auto-generate username when company name changes
    if (value && credentials.username === '') {
      setCredentials(prev => ({
        ...prev,
        username: generateUsername(value)
      }));
    }
  };

  const handleGenerateCredentials = () => {
    const newUsername = generateUsername(formData.companyName);
    const newPassword = generateTemporaryPassword();
    
    setCredentials(prev => ({
      ...prev,
      username: newUsername,
      password: newPassword
    }));
    
    toast({
      title: "Credenciais geradas",
      description: "Novas credenciais foram geradas automaticamente."
    });
  };

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: `${type} copiado para a área de transferência.`,
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar para a área de transferência.",
        variant: "destructive"
      });
    }
  };

  const handleAddContact = () => {
    setContacts(prev => [...prev, {
      name: '',
      email: '',
      phone: '',
      position: '',
      isPrimary: false
    }]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof ClientContact, value: string | boolean) => {
    setContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocuments: ClientDocument[] = Array.from(files).map(file => ({
        id: `doc-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file) // In production, upload to server
      }));
      
      setDocuments(prev => [...prev, ...newDocuments]);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    console.log('CreateClientModal: handleSubmit iniciado', { formData, credentials });
    
    // Validations
    if (!formData.companyName || !formData.cnpj || !formData.email) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!credentials.username) {
      toast({
        title: "Erro", 
        description: "Defina as credenciais de acesso.",
        variant: "destructive"
      });
      return;
    }

    // Generate password if needed
    let finalPassword = credentials.password;
    if (credentials.useTemporaryPassword && !finalPassword) {
      finalPassword = generateTemporaryPassword();
      console.log('CreateClientModal: Senha temporária gerada');
    }

    if (!finalPassword || finalPassword.length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    // Ensure at least one primary contact
    const primaryContact = contacts.find(c => c.isPrimary);
    if (!primaryContact || !primaryContact.name) {
      toast({
        title: "Erro",
        description: "Defina pelo menos um contato principal.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const clientData: Omit<AdminClient, "id" | "createdAt" | "revenue" | "quotesCount"> = {
        ...formData,
        groupId: formData.groupId === 'none' ? undefined : formData.groupId,
        groupName: clientGroups.find(g => g.id === formData.groupId)?.name,
        contacts: contacts.filter(c => c.name), // Only include contacts with names
        documents,
        loginCredentials: {
          username: credentials.username,
          password: finalPassword,
          temporaryPassword: credentials.useTemporaryPassword,
          lastPasswordChange: new Date().toISOString()
        },
        lastAccess: undefined
      };

      console.log('CreateClientModal: Chamando onCreateClient', { clientData });
      await onCreateClient(clientData, {
        sendByEmail: credentials.sendByEmail,
        sendByWhatsApp: credentials.sendByWhatsApp
      });

      // Notification is handled by the hook now - no need for simulated toasts

      toast({
        title: "Cliente criado",
        description: `${formData.companyName} foi cadastrado com sucesso.`
      });

      onOpenChange(false);
      
      // Reset form
      setFormData({
        companyName: '',
        cnpj: '',
        email: '',
        phone: '',
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        },
        groupId: '',
        plan: 'basic',
        status: 'active',
        notes: '',
        clientType: 'direct',
        parentClientId: ''
      });
      setContacts([{
        name: '',
        email: '',
        phone: '',
        position: '',
        isPrimary: true
      }]);
      setDocuments([]);
      setCredentials({
        username: '',
        password: '',
        useTemporaryPassword: true,
        sendByEmail: true,
        sendByWhatsApp: false
      });
      setCurrentTab('basic');

    } catch (error: any) {
      console.error('CreateClientModal: Erro ao criar cliente', error);
      const code = error?.code || error?.error_code;
      const msg = error?.message || error?.error || 'Erro ao criar cliente. Tente novamente.';
      const friendly = code === 'email_exists'
        ? 'Este e-mail já está registrado. Use outro e-mail ou vincule um usuário existente.'
        : msg;
      toast({ title: 'Erro', description: friendly, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cadastrar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Complete todas as informações para criar uma nova conta de cliente
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="access">Acesso</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[60vh] mt-4">
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Empresa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da Empresa *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="Ex: Condomínio Vista Verde"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj} 
                        onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail Principal *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="admin@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+55 11 99999-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group">Grupo</Label>
                      <Select value={formData.groupId} onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum grupo</SelectItem>
                          {clientGroups.filter(group => group.id && group.id.trim() !== '').map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full bg-${group.color}-500`}></div>
                                {group.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan">Plano de Assinatura</Label>
                      <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  <span>{plan.display_name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground ml-2">
                                  R$ {plan.monthly_price.toFixed(2)}/mês
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="street">Logradouro</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.address.number}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, number: e.target.value }
                        }))}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.address.complement}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, complement: e.target.value }
                        }))}
                        placeholder="Apto, Sala, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.address.neighborhood}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, neighborhood: e.target.value }
                        }))}
                        placeholder="Centro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.address.state}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        placeholder="SP"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações sobre o cliente..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contatos
                    </span>
                    <Button onClick={handleAddContact} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Cadastre os contatos responsáveis. Pelo menos um deve ser marcado como principal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Contato {index + 1}</span>
                          {contact.isPrimary && (
                            <Badge variant="default" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        {contacts.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveContact(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome *</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cargo</Label>
                          <Input
                            value={contact.position}
                            onChange={(e) => handleContactChange(index, 'position', e.target.value)}
                            placeholder="Ex: Síndico, Administrador"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input
                            type="email"
                            value={contact.email}
                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input
                            value={contact.phone}
                            onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                            placeholder="+55 11 99999-0000"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`primary-${index}`}
                          checked={contact.isPrimary}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Set this as primary and unset others
                              setContacts(prev => prev.map((c, i) => ({
                                ...c,
                                isPrimary: i === index
                              })));
                            }
                          }}
                        />
                        <Label htmlFor={`primary-${index}`}>Contato principal</Label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos
                  </CardTitle>
                  <CardDescription>
                    Faça upload dos documentos do cliente (contratos, CNPJ, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="document-upload"
                    />
                    <label htmlFor="document-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX, JPG, PNG até 10MB cada
                      </p>
                    </label>
                  </div>

                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <Label>Documentos Enviados</Label>
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Credenciais de Acesso
                  </CardTitle>
                  <CardDescription>
                    Configure o login e senha. Por padrão, o cliente terá privilégios de administrador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Privilégio: Administrador do Cliente
                      </span>
                    </div>
                    <Badge variant="default" className="bg-blue-600">Admin</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de Usuário</Label>
                      <div className="flex gap-2">
                        <Input
                          id="username"
                          value={credentials.username}
                          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="usuario123"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyToClipboard(credentials.username, 'Nome de usuário')}
                          disabled={!credentials.username}
                          title="Copiar nome de usuário"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateCredentials}
                          title="Gerar novas credenciais"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={credentials.password}
                            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                            placeholder={credentials.useTemporaryPassword ? "Senha gerada automaticamente" : "Digite uma senha"}
                            disabled={credentials.useTemporaryPassword}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyToClipboard(credentials.password, 'Senha')}
                          disabled={!credentials.password}
                          title="Copiar senha"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="temporary-password"
                      checked={credentials.useTemporaryPassword}
                      onCheckedChange={(checked) => {
                        setCredentials(prev => ({ 
                          ...prev, 
                          useTemporaryPassword: checked,
                          password: checked ? generateTemporaryPassword() : ''
                        }));
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="temporary-password">Gerar senha temporária automaticamente</Label>
                      <p className="text-xs text-muted-foreground">
                        {credentials.useTemporaryPassword 
                          ? "Senha será gerada automaticamente (10 caracteres com letras e números)"
                          : "Digite uma senha personalizada (mínimo 6 caracteres)"
                        }
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base font-medium">Enviar Credenciais</Label>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send-email"
                        checked={credentials.sendByEmail}
                        onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, sendByEmail: checked }))}
                      />
                      <Label htmlFor="send-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Enviar por E-mail
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send-whatsapp"
                        checked={credentials.sendByWhatsApp}
                        onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, sendByWhatsApp: checked }))}
                      />
                      <Label htmlFor="send-whatsapp" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Enviar por WhatsApp
                      </Label>
                    </div>

                    {(credentials.sendByEmail || credentials.sendByWhatsApp) && (
                      <div className="p-4 bg-muted rounded-lg space-y-1">
                        <p className="text-sm text-muted-foreground">
                          As credenciais serão enviadas automaticamente após o cadastro ser concluído.
                        </p>
                        {credentials.sendByWhatsApp && (
                          <p className="text-xs text-muted-foreground">
                            WhatsApp: será enviado para {(
                              contacts.find(c => c.isPrimary)?.phone || formData.phone || 'número não informado'
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Etapa {currentTab === 'basic' ? '1' : currentTab === 'contacts' ? '2' : currentTab === 'documents' ? '3' : '4'} de 4
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              
              {currentTab !== 'access' ? (
                <Button
                  onClick={() => {
                    const tabs = ['basic', 'contacts', 'documents', 'access'];
                    const currentIndex = tabs.indexOf(currentTab);
                    if (currentIndex < tabs.length - 1) {
                      setCurrentTab(tabs[currentIndex + 1]);
                    }
                  }}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Criar Cliente
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};