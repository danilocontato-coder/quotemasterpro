import { useState, useEffect } from "react";
import { Plus, Mail, Phone, MessageCircle, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Supplier, SupplierGroup, supplierSpecialties } from "@/data/mockData";

interface NewSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreate: (supplier: Supplier) => void;
  availableGroups: SupplierGroup[];
  editingSupplier?: Supplier;
}

export function NewSupplierModal({ open, onOpenChange, onSupplierCreate, availableGroups, editingSupplier }: NewSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    // Endereço separado
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    // Outros campos
    contactPerson: "",
    description: "",
    website: "",
    groupId: "",
    specialties: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preenche os dados quando está editando
  useEffect(() => {
    if (editingSupplier) {
      // Parse address back to individual fields (simple approach)
      const addressParts = editingSupplier.address?.split(', ') || [];
      
      setFormData({
        name: editingSupplier.name || "",
        cnpj: editingSupplier.cnpj || "",
        email: editingSupplier.email || "",
        phone: editingSupplier.phone || "",
        whatsapp: editingSupplier.whatsapp || "",
        street: addressParts[0]?.split(', ')[0] || "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
        contactPerson: "",
        description: "",
        website: "",
        groupId: editingSupplier.groupId || "",
        specialties: editingSupplier.specialties || []
      });
    } else {
      // Reset form when not editing
      setFormData({
        name: "",
        cnpj: "",
        email: "",
        phone: "",
        whatsapp: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
        contactPerson: "",
        description: "",
        website: "",
        groupId: "",
        specialties: []
      });
    }
  }, [editingSupplier, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome da empresa é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
      newErrors.cnpj = "CNPJ deve estar no formato 00.000.000/0000-00";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Monta endereço completo
    const fullAddress = [
      `${formData.street}${formData.number ? `, ${formData.number}` : ''}`,
      formData.complement,
      formData.neighborhood,
      `${formData.city} - ${formData.state}`,
      formData.zipCode
    ].filter(Boolean).join(', ');

    const newSupplier: Supplier = {
      id: editingSupplier ? editingSupplier.id : `supplier-${Date.now()}`,
      name: formData.name,
      cnpj: formData.cnpj,
      email: formData.email,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      address: fullAddress,
      status: editingSupplier ? editingSupplier.status : 'active',
      subscriptionPlan: editingSupplier ? editingSupplier.subscriptionPlan : 'basic',
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
      groupId: formData.groupId || undefined,
      specialties: formData.specialties,
      type: 'local', // Novos fornecedores são sempre locais
      clientId: '1', // TODO: Pegar do contexto do cliente logado
      rating: 0, // Novo fornecedor ainda sem avaliação
      completedOrders: 0 // Novo fornecedor ainda sem pedidos
    };

    onSupplierCreate(newSupplier);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      whatsapp: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      contactPerson: "",
      description: "",
      website: "",
      groupId: "",
      specialties: []
    });
    setErrors({});
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Nome da Empresa *
                  </label>
                  <Input
                    placeholder="Ex: Materiais Santos Ltda"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">CNPJ</label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const formatted = formatCNPJ(e.target.value);
                      if (formatted.length <= 18) {
                        setFormData(prev => ({ ...prev, cnpj: formatted }));
                      }
                    }}
                    className={errors.cnpj ? "border-destructive" : ""}
                  />
                  {errors.cnpj && (
                    <p className="text-xs text-destructive mt-1">{errors.cnpj}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Website</label>
                <Input
                  placeholder="https://www.empresa.com.br"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Grupo</label>
                <Select value={formData.groupId} onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione um grupo (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    {availableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${group.color}`}></div>
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Especialidades</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                  {supplierSpecialties.map((specialty) => (
                    <div key={specialty} className="flex items-center space-x-2">
                      <Checkbox
                        id={specialty}
                        checked={formData.specialties.includes(specialty)}
                        onCheckedChange={() => handleSpecialtyToggle(specialty)}
                      />
                      <label
                        htmlFor={specialty}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {specialty}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  placeholder="Descreva os produtos e serviços oferecidos..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  E-mail Principal *
                </label>
                <Input
                  type="email"
                  placeholder="contato@empresa.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefone</label>
                  <Input
                    placeholder="(11) 3456-7890"
                    value={formData.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setFormData(prev => ({ ...prev, phone: formatted }));
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">WhatsApp</label>
                  <Input
                    placeholder="(11) 99876-5432"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setFormData(prev => ({ ...prev, whatsapp: formatted }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Pessoa de Contato</label>
                <Input
                  placeholder="Nome do responsável comercial"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Rua/Avenida</label>
                  <Input
                    placeholder="Ex: Rua das Flores"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Número</label>
                  <Input
                    placeholder="123"
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Complemento</label>
                  <Input
                    placeholder="Sala 101, Bloco A..."
                    value={formData.complement}
                    onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Bairro</label>
                  <Input
                    placeholder="Centro"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Cidade</label>
                  <Input
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado</label>
                  <Input
                    placeholder="SP"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">CEP</label>
                  <Input
                    placeholder="01234-567"
                    value={formData.zipCode}
                    onChange={(e) => {
                      const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
                      if (formatted.length <= 9) {
                        setFormData(prev => ({ ...prev, zipCode: formatted }));
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
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
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}