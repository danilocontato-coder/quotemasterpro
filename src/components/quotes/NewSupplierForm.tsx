import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Supplier } from "@/data/mockData";

interface NewSupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreate: (supplier: Supplier) => void;
}

export function NewSupplierForm({ open, onOpenChange, onSupplierCreate }: NewSupplierFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) return;

    const newSupplier: Supplier = {
      id: `new-supplier-${Date.now()}`,
      name: formData.name,
      cnpj: formData.cnpj,
      email: formData.email,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      address: formData.address,
      status: 'active',
      subscriptionPlan: 'basic',
      createdAt: new Date().toISOString()
    };

    onSupplierCreate(newSupplier);
    
    // Reset form
    setFormData({
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: ""
    });
    
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Nome da Empresa *</label>
            <Input
              placeholder="Ex: Materiais Santos Ltda"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">CNPJ</label>
            <Input
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">E-mail *</label>
            <Input
              type="email"
              placeholder="contato@empresa.com.br"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Telefone</label>
            <Input
              placeholder="(11) 3456-7890"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">WhatsApp</label>
            <Input
              placeholder="(11) 99876-5432"
              value={formData.whatsapp}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Endereço</label>
            <Input
              placeholder="Rua, número, bairro - Cidade, UF"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || !formData.email.trim()}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}