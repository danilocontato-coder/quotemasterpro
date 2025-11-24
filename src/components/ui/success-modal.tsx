import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Eye, EyeOff, Mail, Phone, MapPin, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierData {
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
}

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  onViewInList: () => void;
  supplierData: SupplierData;
  credentials?: {
    email: string;
    password: string;
  };
}

export function SuccessModal({
  open,
  onClose,
  onViewInList,
  supplierData,
  credentials,
}: SuccessModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nSenha: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Credenciais copiadas',
      description: 'As credenciais foram copiadas para a área de transferência.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl">
              Fornecedor Criado com Sucesso!
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do Fornecedor */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{supplierData.name}</p>
                <p className="text-xs text-muted-foreground">Nome do fornecedor</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{supplierData.email}</p>
                <p className="text-xs text-muted-foreground">Email de contato</p>
              </div>
            </div>

            {supplierData.whatsapp && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{supplierData.whatsapp}</p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                </div>
              </div>
            )}

            {supplierData.city && supplierData.state && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {supplierData.city} - {supplierData.state}
                  </p>
                  <p className="text-xs text-muted-foreground">Localização</p>
                </div>
              </div>
            )}
          </div>

          {/* Credenciais de Acesso */}
          {credentials && (
            <div className="space-y-3 p-4 border-2 border-green-200 bg-green-50 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                🔐 Credenciais de Acesso
              </h3>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-green-700 font-medium">Email:</p>
                  <p className="text-sm font-mono text-green-900">{credentials.email}</p>
                </div>
                
                <div>
                  <p className="text-xs text-green-700 font-medium">Senha inicial:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-green-900">
                      {showPassword ? credentials.password : '••••••••••'}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-7 w-7 p-0"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCredentials}
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-green-700 mt-2">
                ✉️ Um email de boas-vindas com estas credenciais foi enviado para o fornecedor.
              </p>
            </div>
          )}

          {/* Próximos Passos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Próximos passos:</strong> O fornecedor pode acessar o sistema imediatamente 
              usando as credenciais fornecidas. Ele será solicitado a alterar a senha no primeiro acesso.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button onClick={onViewInList} className="flex-1 bg-green-600 hover:bg-green-700">
            Ver Fornecedor na Lista 🎯
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
