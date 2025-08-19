import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Supplier } from "@/data/mockData";

interface QuickAddSupplierProps {
  onSupplierAdd: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
}

export function QuickAddSupplier({ onSupplierAdd }: QuickAddSupplierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    status: 'active' as const,
    subscriptionPlan: 'basic' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSupplierAdd(formData);
    setIsOpen(false);
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      status: 'active',
      subscriptionPlan: 'basic'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Building2 className="h-4 w-4 mr-2" />
          Criar Novo Fornecedor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Fornecedor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da Empresa</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Razão social da empresa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 0000-0000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contato@empresa.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp</label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Endereço</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Endereço completo"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Plano de Assinatura</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData(prev => ({ ...prev, subscriptionPlan: e.target.value as any }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="basic">Básico</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Fornecedor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}