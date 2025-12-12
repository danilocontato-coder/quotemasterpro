import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Landmark, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { maskPixKeyDisplay, detectPixKeyType, getPixKeyTypeLabel, validatePixKey } from "@/utils/pixKeyValidation";

interface BankDataSectionProps {
  supplierData: {
    bank_data: any;
  };
  setSupplierData: React.Dispatch<React.SetStateAction<any>>;
  currentUser: any;
}

export function BankDataSection({ supplierData, setSupplierData, currentUser }: BankDataSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pixKey, setPixKey] = useState(supplierData.bank_data?.pix_key || '');
  
  const pixKeyType = detectPixKeyType(pixKey);
  const pixValidation = validatePixKey(pixKey);

  const handleSavePixKey = async () => {
    if (!pixKey.trim()) {
      toast.error('Digite uma chave PIX válida');
      return;
    }

    if (!pixValidation.valid) {
      toast.error(pixValidation.message || 'Chave PIX inválida');
      return;
    }

    setIsSaving(true);
    try {
      // Buscar supplier_id do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', currentUser.id)
        .single();

      if (!profile?.supplier_id) {
        throw new Error('Fornecedor não encontrado');
      }

      // Atualizar chave PIX - tanto no campo pix_key quanto no bank_data
      const updatedBankData = {
        ...(supplierData.bank_data || {}),
        pix_key: pixKey.trim()
      };

      const { error } = await supabase
        .from('suppliers')
        .update({
          pix_key: pixKey.trim(),
          bank_data: updatedBankData,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.supplier_id);

      if (error) throw error;

      // Atualizar estado local
      setSupplierData((prev: any) => ({
        ...prev,
        bank_data: updatedBankData
      }));

      toast.success('Chave PIX cadastrada com sucesso!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar chave PIX:', error);
      toast.error('Erro ao salvar chave PIX');
    } finally {
      setIsSaving(false);
    }
  };

  const hasPixKey = supplierData.bank_data?.pix_key;

  return (
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
        {hasPixKey && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Chave PIX configurada</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500">
                Seus dados estão configurados e prontos para receber transferências.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Chave PIX Cadastrada</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={maskPixKeyDisplay(supplierData.bank_data.pix_key)} 
                  disabled 
                  className="bg-muted flex-1" 
                />
                <Badge variant="outline" className="shrink-0">
                  {getPixKeyTypeLabel(detectPixKeyType(supplierData.bank_data.pix_key))}
                </Badge>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setPixKey(supplierData.bank_data.pix_key);
                setIsEditing(true);
              }}
            >
              Alterar Chave PIX
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!hasPixKey && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Chave PIX não configurada</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Configure sua chave PIX para receber pagamentos quando as entregas forem confirmadas.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pix-key">Chave PIX</Label>
              <div className="flex gap-2">
                <Input
                  id="pix-key"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, E-mail, Celular ou Chave Aleatória"
                  className="flex-1"
                />
                {pixKey && pixKeyType && (
                  <Badge 
                    variant={pixValidation.valid ? "default" : "secondary"} 
                    className="shrink-0 self-center"
                  >
                    {getPixKeyTypeLabel(pixKeyType)}
                  </Badge>
                )}
              </div>
              {pixKey && !pixValidation.valid && (
                <p className="text-xs text-destructive">{pixValidation.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Tipos aceitos: CPF, CNPJ, E-mail, Celular (+55) ou Chave Aleatória (EVP)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSavePixKey}
                disabled={isSaving || !pixValidation.valid}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Chave PIX
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setPixKey(supplierData.bank_data?.pix_key || '');
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Dados bancários adicionais (somente leitura) */}
        {supplierData.bank_data?.account_number && (
          <div className="pt-4 border-t space-y-4">
            <Label className="text-base font-medium">Dados Bancários Adicionais</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Banco</Label>
                <Input value={supplierData.bank_data.bank_code} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Agência</Label>
                <Input value={supplierData.bank_data.agency} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Conta</Label>
                <Input value={supplierData.bank_data.account_number} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Titular</Label>
                <Input value={supplierData.bank_data.account_holder_name} disabled className="bg-muted" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
