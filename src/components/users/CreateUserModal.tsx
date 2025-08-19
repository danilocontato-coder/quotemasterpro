import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Shield, Key, Copy } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const { createUser, generateTemporaryPassword } = useUsers();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "collaborator" as "admin" | "manager" | "collaborator" | "supplier",
    status: "active" as "active" | "inactive",
    client: "",
    supplier: ""
  });
  const [passwordOption, setPasswordOption] = useState<"manual" | "temporary">("temporary");
  const [manualPassword, setManualPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [sendMethod, setSendMethod] = useState<"email" | "whatsapp">("email");

  const handleGeneratePassword = () => {
    const newPassword = generateTemporaryPassword();
    setTemporaryPassword(newPassword);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword);
    toast({
      title: "Senha copiada",
      description: "A senha temporária foi copiada para a área de transferência.",
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (passwordOption === "manual" && !manualPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Digite uma senha para o usuário.",
        variant: "destructive",
      });
      return;
    }

    if (passwordOption === "temporary" && !temporaryPassword) {
      toast({
        title: "Senha temporária",
        description: "Gere uma senha temporária para o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      createUser(formData);
      
      if (passwordOption === "temporary") {
        toast({
          title: "Usuário criado com sucesso",
          description: `Senha temporária ${sendMethod === 'email' ? 'enviada por email' : 'enviada por WhatsApp'}.`,
        });
      } else {
        toast({
          title: "Usuário criado com sucesso",
          description: "O usuário pode fazer login com a senha definida.",
        });
      }
      
      onClose();
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "collaborator",
        status: "active",
        client: "",
        supplier: ""
      });
      setManualPassword("");
      setTemporaryPassword("");
    } catch (error) {
      toast({
        title: "Erro ao criar usuário",
        description: "Ocorreu um erro ao criar o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: "Acesso completo ao sistema e configurações",
      manager: "Gerenciamento de cotações, aprovações e usuários",
      collaborator: "Criação e edição de cotações",
      supplier: "Resposta a cotações e gestão de produtos"
    };
    return descriptions[role as keyof typeof descriptions] || "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Criar Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="access">Acesso e Perfil</TabsTrigger>
            <TabsTrigger value="password">Senha</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                <CardDescription>
                  Dados básicos do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+55 11 99999-0000"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perfil de Acesso</CardTitle>
                <CardDescription>
                  Configure o perfil e permissões do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil do Usuário</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-destructive" />
                          <span>Administrador</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span>Gerente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="collaborator">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-secondary" />
                          <span>Colaborador</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="supplier">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-warning" />
                          <span>Fornecedor</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.role && (
                    <p className="text-sm text-muted-foreground">
                      {getRoleDescription(formData.role)}
                    </p>
                  )}
                </div>

                <Separator />

                {(formData.role === "manager" || formData.role === "collaborator") && (
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente/Condomínio</Label>
                    <Select value={formData.client} onValueChange={(value) => setFormData({...formData, client: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="condominioazul">Condomínio Azul</SelectItem>
                        <SelectItem value="condominioverde">Condomínio Verde</SelectItem>
                        <SelectItem value="condominioamarelo">Condomínio Amarelo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.role === "supplier" && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Fornecedor</Label>
                    <Select value={formData.supplier} onValueChange={(value) => setFormData({...formData, supplier: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fornecedoralpha">Fornecedor Alpha</SelectItem>
                        <SelectItem value="fornecedorbeta">Fornecedor Beta</SelectItem>
                        <SelectItem value="fornecedorgamma">Fornecedor Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Status do Usuário</Label>
                    <p className="text-sm text-muted-foreground">
                      Usuário pode fazer login no sistema
                    </p>
                  </div>
                  <Switch
                    checked={formData.status === "active"}
                    onCheckedChange={(checked) => setFormData({...formData, status: checked ? "active" : "inactive"})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuração de Senha</CardTitle>
                <CardDescription>
                  Defina como o usuário receberá suas credenciais de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="temporary"
                      name="passwordOption"
                      checked={passwordOption === "temporary"}
                      onChange={() => setPasswordOption("temporary")}
                    />
                    <Label htmlFor="temporary">Gerar senha temporária</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="manual"
                      name="passwordOption"
                      checked={passwordOption === "manual"}
                      onChange={() => setPasswordOption("manual")}
                    />
                    <Label htmlFor="manual">Definir senha manualmente</Label>
                  </div>
                </div>

                <Separator />

                {passwordOption === "temporary" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button onClick={handleGeneratePassword} variant="outline">
                        <Key className="h-4 w-4 mr-2" />
                        Gerar Senha
                      </Button>
                      {temporaryPassword && (
                        <Button onClick={handleCopyPassword} variant="ghost" size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                      )}
                    </div>
                    
                    {temporaryPassword && (
                      <div className="p-3 bg-muted rounded-md">
                        <Label className="text-sm font-medium">Senha Temporária:</Label>
                        <p className="font-mono text-lg font-bold">{temporaryPassword}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          O usuário deverá alterar esta senha no primeiro acesso
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Método de Envio</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="email"
                            name="sendMethod"
                            checked={sendMethod === "email"}
                            onChange={() => setSendMethod("email")}
                          />
                          <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            E-mail
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="whatsapp"
                            name="sendMethod"
                            checked={sendMethod === "whatsapp"}
                            onChange={() => setSendMethod("whatsapp")}
                          />
                          <Label htmlFor="whatsapp" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {passwordOption === "manual" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Digite a senha do usuário"
                    />
                    <p className="text-sm text-muted-foreground">
                      Mínimo de 8 caracteres, com letras e números
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Usuário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}