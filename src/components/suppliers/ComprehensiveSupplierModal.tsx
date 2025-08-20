import { useState, useEffect } from "react";
import { Plus, Building, User, Key, RefreshCw, Eye, EyeOff, MapPin, Globe, FileText, Shield, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AdminSupplier } from "@/hooks/useAdminSuppliers";
import { supplierSpecialties } from "@/data/mockData";
import { toast } from "sonner";

// Accept both admin groups and mock groups
type BasicGroup = { id: string; name: string; color?: string };

interface ComprehensiveSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreate: (supplier: Omit<AdminSupplier, "id" | "createdAt" | "financialInfo" | "ratings" | "avgRating">) => void;
  availableGroups: BasicGroup[];
  editingSupplier?: any | null;
  onPasswordGenerate: () => string;
  onUsernameGenerate: (companyName: string) => string;
}


const businessCategories = [
  "Materiais de Construção", "Ferramentas", "Elétrica", "Hidráulica", "Pintura",
  "Limpeza", "Conservação", "Segurança", "Jardinagem", "Manutenção",
  "Consultoria", "Projetos", "Engenharia", "Arquitetura", "Decoração"
];

const serviceAreas = [
  "São Paulo - Capital", "ABC Paulista", "Guarulhos", "Osasco", "São Bernardo",
  "Santo André", "São Caetano", "Diadema", "Mauá", "Ribeirão Pires"
];

const certificationOptions = [
  "ISO 9001", "ISO 14001", "PBQP-H", "INMETRO", "CREA", "CAU", "Vigilância Sanitária", "Bombeiros"
];

export function ComprehensiveSupplierModal({
  open,
  onOpenChange,
  onSupplierCreate,
  availableGroups,
  editingSupplier,
  onPasswordGenerate,
  onUsernameGenerate
}: ComprehensiveSupplierModalProps) {
  const [activeTab, setActiveTab] = useState("company");
  const [showPassword, setShowPassword] = useState(false);
  const [useAutoCredentials, setUseAutoCredentials] = useState(true);

  const [formData, setFormData] = useState({
    // Company Info
    companyName: "",
    cnpj: "",
    email: "",
    phone: "",
    website: "",
    
    // Address
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: ""
    },
    
    // Contacts
    contacts: [{
      name: "",
      email: "",
      phone: "",
      position: "",
      isPrimary: true
    }],
    
    // Group and Status
    groupId: "",
    status: "pending" as "active" | "inactive" | "pending" | "suspended",
    plan: "basic",
    
    // Login Credentials
    loginCredentials: {
      username: "",
      password: "",
      temporaryPassword: true
    },
    
    // Business Info
    businessInfo: {
      categories: [] as string[],
      specialties: [] as string[],
      servicesOffered: [] as string[],
      coverage: [] as string[],
      businessHours: "Segunda a Sexta: 8h às 18h",
      languages: ["Português"]
    },
    
    // Documents
    documents: [] as any[],
    
    // Additional Info
    notes: "",
    certifications: [] as string[],
    insurance: {
      provider: "",
      policyNumber: "",
      expiryDate: "",
      coverage: 0
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingSupplier && open) {
      setFormData({
        companyName: editingSupplier.name || "",
        cnpj: editingSupplier.cnpj || "",
        email: editingSupplier.email || "",
        phone: editingSupplier.phone || "",
        website: editingSupplier.website || "",
        address: editingSupplier.address || {},
        contacts: [], // Initialize as empty array since Supabase structure is different
        groupId: "", // Initialize as empty since not in Supabase structure
        status: editingSupplier.status || "pending",
        plan: editingSupplier.subscription_plan_id || "basic",
        loginCredentials: {
          username: "", // Initialize as empty since not in Supabase structure
          password: "",
          temporaryPassword: true
        },
        businessInfo: {
          categories: editingSupplier.business_info?.categories || [],
          specialties: editingSupplier.specialties || [],
          servicesOffered: editingSupplier.business_info?.servicesOffered || [],
          coverage: editingSupplier.business_info?.coverage || [],
          businessHours: editingSupplier.business_info?.businessHours || "Segunda a Sexta: 8h às 18h",
          languages: editingSupplier.business_info?.languages || ["Português"]
        },
        documents: [], // Initialize as empty array since not in Supabase structure
        notes: "", // Initialize as empty since not in Supabase structure
        certifications: [], // Initialize as empty array since not in Supabase structure
        insurance: {
          provider: "",
          policyNumber: "",
          expiryDate: "",
          coverage: 0
        }
      });
      setUseAutoCredentials(false);
    } else if (!editingSupplier && open) {
      handleReset();
    }
  }, [editingSupplier, open]);

  // Auto-generate credentials when company name changes
  useEffect(() => {
    if (useAutoCredentials && formData.companyName && !editingSupplier) {
      const username = onUsernameGenerate(formData.companyName);
      const password = onPasswordGenerate();
      
      setFormData(prev => ({
        ...prev,
        loginCredentials: {
          ...prev.loginCredentials,
          username,
          password
        }
      }));
    }
  }, [formData.companyName, useAutoCredentials, editingSupplier, onUsernameGenerate, onPasswordGenerate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Company validation
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Nome da empresa é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
      newErrors.cnpj = "CNPJ deve estar no formato 00.000.000/0000-00";
    }

    // Credentials validation
    if (!formData.loginCredentials.username.trim()) {
      newErrors.username = "Nome de usuário é obrigatório";
    }

    if (!formData.loginCredentials.password && !editingSupplier) {
      newErrors.password = "Senha é obrigatória";
    }

    // Contact validation
    if (!formData.contacts[0].name.trim()) {
      newErrors.contactName = "Nome do contato principal é obrigatório";
    }

    if (!formData.contacts[0].email.trim()) {
      newErrors.contactEmail = "E-mail do contato principal é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    const supplierData: Omit<AdminSupplier, "id" | "createdAt" | "financialInfo" | "ratings" | "avgRating"> = {
      companyName: formData.companyName,
      cnpj: formData.cnpj,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      address: formData.address,
      contacts: formData.contacts,
      groupId: formData.groupId,
      groupName: availableGroups.find(g => g.id === formData.groupId)?.name,
      status: formData.status,
      plan: formData.plan,
      loginCredentials: {
        username: formData.loginCredentials.username,
        password: formData.loginCredentials.password,
        temporaryPassword: formData.loginCredentials.temporaryPassword,
        lastPasswordChange: new Date().toISOString()
      },
      documents: formData.documents,
      businessInfo: formData.businessInfo,
      notes: formData.notes,
      certifications: formData.certifications,
      insurance: formData.insurance.provider ? formData.insurance : undefined
    };

    onSupplierCreate(supplierData);
    handleReset();
    onOpenChange(false);
    
    toast.success(editingSupplier ? "Fornecedor atualizado com sucesso!" : "Fornecedor criado com sucesso!");
  };

  const handleReset = () => {
    setFormData({
      companyName: "",
      cnpj: "",
      email: "",
      phone: "",
      website: "",
      address: {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: ""
      },
      contacts: [{
        name: "",
        email: "",
        phone: "",
        position: "",
        isPrimary: true
      }],
      groupId: "",
      status: "pending",
      plan: "basic",
      loginCredentials: {
        username: "",
        password: "",
        temporaryPassword: true
      },
      businessInfo: {
        categories: [],
        specialties: [],
        servicesOffered: [],
        coverage: [],
        businessHours: "Segunda a Sexta: 8h às 18h",
        languages: ["Português"]
      },
      documents: [],
      notes: "",
      certifications: [],
      insurance: {
        provider: "",
        policyNumber: "",
        expiryDate: "",
        coverage: 0
      }
    });
    setErrors({});
    setActiveTab("company");
    setUseAutoCredentials(true);
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

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, {
        name: "",
        email: "",
        phone: "",
        position: "",
        isPrimary: false
      }]
    }));
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index)
      }));
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        categories: prev.businessInfo.categories.includes(category)
          ? prev.businessInfo.categories.filter(c => c !== category)
          : [...prev.businessInfo.categories, category]
      }
    }));
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        specialties: prev.businessInfo.specialties.includes(specialty)
          ? prev.businessInfo.specialties.filter(s => s !== specialty)
          : [...prev.businessInfo.specialties, specialty]
      }
    }));
  };

  const toggleCoverage = (area: string) => {
    setFormData(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        coverage: prev.businessInfo.coverage.includes(area)
          ? prev.businessInfo.coverage.filter(c => c !== area)
          : [...prev.businessInfo.coverage, area]
      }
    }));
  };

  const toggleCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingSupplier ? <Building className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor Completo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="contacts">Contatos</TabsTrigger>
              <TabsTrigger value="business">Negócio</TabsTrigger>
              <TabsTrigger value="credentials">Acesso</TabsTrigger>
              <TabsTrigger value="additional">Extras</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-6">
              {/* Company Tab */}
              <TabsContent value="company" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Informações da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome da Empresa *</label>
                        <Input
                          placeholder="Ex: TechFlow Solutions Ltda"
                          value={formData.companyName}
                          onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                          className={errors.companyName ? "border-destructive" : ""}
                        />
                        {errors.companyName && (
                          <p className="text-xs text-destructive mt-1">{errors.companyName}</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">E-mail Principal *</label>
                        <Input
                          type="email"
                          placeholder="comercial@empresa.com.br"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className={errors.email ? "border-destructive" : ""}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive mt-1">{errors.email}</p>
                        )}
                      </div>

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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
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
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Rua/Avenida"
                          value={formData.address.street}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Número"
                          value={formData.address.number}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, number: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Bairro"
                        value={formData.address.neighborhood}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, neighborhood: e.target.value }
                        }))}
                      />
                      <Input
                        placeholder="Complemento"
                        value={formData.address.complement}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, complement: e.target.value }
                        }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Cidade"
                        value={formData.address.city}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                      />
                      <Input
                        placeholder="Estado"
                        value={formData.address.state}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value.toUpperCase() }
                        }))}
                        maxLength={2}
                      />
                      <Input
                        placeholder="CEP"
                        value={formData.address.zipCode}
                        onChange={(e) => {
                          const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
                          if (formatted.length <= 9) {
                            setFormData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, zipCode: formatted }
                            }));
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contatos da Empresa
                    </CardTitle>
                    <Button type="button" onClick={addContact} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.contacts.map((contact, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={contact.isPrimary ? "default" : "secondary"}>
                            {contact.isPrimary ? "Contato Principal" : `Contato ${index + 1}`}
                          </Badge>
                          {!contact.isPrimary && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeContact(index)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Nome *</label>
                            <Input
                              placeholder="Nome do contato"
                              value={contact.name}
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index] = { ...contact, name: e.target.value };
                                setFormData(prev => ({ ...prev, contacts: newContacts }));
                              }}
                              className={index === 0 && errors.contactName ? "border-destructive" : ""}
                            />
                            {index === 0 && errors.contactName && (
                              <p className="text-xs text-destructive mt-1">{errors.contactName}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-1 block">Cargo</label>
                            <Input
                              placeholder="Ex: Diretor Comercial"
                              value={contact.position}
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index] = { ...contact, position: e.target.value };
                                setFormData(prev => ({ ...prev, contacts: newContacts }));
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">E-mail *</label>
                            <Input
                              type="email"
                              placeholder="contato@empresa.com"
                              value={contact.email}
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index] = { ...contact, email: e.target.value };
                                setFormData(prev => ({ ...prev, contacts: newContacts }));
                              }}
                              className={index === 0 && errors.contactEmail ? "border-destructive" : ""}
                            />
                            {index === 0 && errors.contactEmail && (
                              <p className="text-xs text-destructive mt-1">{errors.contactEmail}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-1 block">Telefone</label>
                            <Input
                              placeholder="(11) 99999-9999"
                              value={contact.phone}
                              onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                const newContacts = [...formData.contacts];
                                newContacts[index] = { ...contact, phone: formatted };
                                setFormData(prev => ({ ...prev, contacts: newContacts }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business Tab */}
              <TabsContent value="business" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Informações do Negócio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-3 block">Categorias de Negócio</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                        {businessCategories.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category}`}
                              checked={formData.businessInfo.categories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                            />
                            <label
                              htmlFor={`category-${category}`}
                              className="text-xs font-medium leading-none cursor-pointer"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-3 block">Especialidades</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                        {supplierSpecialties.map((specialty) => (
                          <div key={specialty} className="flex items-center space-x-2">
                            <Checkbox
                              id={`specialty-${specialty}`}
                              checked={formData.businessInfo.specialties.includes(specialty)}
                              onCheckedChange={() => toggleSpecialty(specialty)}
                            />
                            <label
                              htmlFor={`specialty-${specialty}`}
                              className="text-xs font-medium leading-none cursor-pointer"
                            >
                              {specialty}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-3 block">Áreas de Atendimento</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                        {serviceAreas.map((area) => (
                          <div key={area} className="flex items-center space-x-2">
                            <Checkbox
                              id={`coverage-${area}`}
                              checked={formData.businessInfo.coverage.includes(area)}
                              onCheckedChange={() => toggleCoverage(area)}
                            />
                            <label
                              htmlFor={`coverage-${area}`}
                              className="text-xs font-medium leading-none cursor-pointer"
                            >
                              {area}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Horário de Funcionamento</label>
                      <Input
                        placeholder="Ex: Segunda a Sexta: 8h às 18h"
                        value={formData.businessInfo.businessHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessInfo: { ...prev.businessInfo, businessHours: e.target.value }
                        }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Credentials Tab */}
              <TabsContent value="credentials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Credenciais de Acesso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <Switch
                        checked={useAutoCredentials && !editingSupplier}
                        onCheckedChange={setUseAutoCredentials}
                        disabled={!!editingSupplier}
                      />
                      <label className="text-sm font-medium">
                        Gerar credenciais automaticamente
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome de Usuário *</label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="usuario_fornecedor"
                            value={formData.loginCredentials.username}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              loginCredentials: { ...prev.loginCredentials, username: e.target.value }
                            }))}
                            className={errors.username ? "border-destructive" : ""}
                            disabled={useAutoCredentials && !editingSupplier}
                          />
                          {!useAutoCredentials && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (formData.companyName) {
                                  const username = onUsernameGenerate(formData.companyName);
                                  setFormData(prev => ({
                                    ...prev,
                                    loginCredentials: { ...prev.loginCredentials, username }
                                  }));
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {errors.username && (
                          <p className="text-xs text-destructive mt-1">{errors.username}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Senha *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="senha123"
                              value={formData.loginCredentials.password}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                loginCredentials: { ...prev.loginCredentials, password: e.target.value }
                              }))}
                              className={errors.password ? "border-destructive" : ""}
                              disabled={useAutoCredentials && !editingSupplier}
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
                          {!useAutoCredentials && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const password = onPasswordGenerate();
                                setFormData(prev => ({
                                  ...prev,
                                  loginCredentials: { ...prev.loginCredentials, password }
                                }));
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {errors.password && (
                          <p className="text-xs text-destructive mt-1">{errors.password}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.loginCredentials.temporaryPassword}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          loginCredentials: { ...prev.loginCredentials, temporaryPassword: !!checked }
                        }))}
                      />
                      <label className="text-sm font-medium">
                        Senha temporária (usuário deve alterar no primeiro acesso)
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                            <SelectItem value="suspended">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Plano</label>
                        <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Additional Tab */}
              <TabsContent value="additional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                      {certificationOptions.map((cert) => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cert-${cert}`}
                            checked={formData.certifications.includes(cert)}
                            onCheckedChange={() => toggleCertification(cert)}
                          />
                          <label
                            htmlFor={`cert-${cert}`}
                            className="text-xs font-medium leading-none cursor-pointer"
                          >
                            {cert}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Seguro Empresarial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Seguradora</label>
                        <Input
                          placeholder="Nome da seguradora"
                          value={formData.insurance.provider}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            insurance: { ...prev.insurance, provider: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Número da Apólice</label>
                        <Input
                          placeholder="POL-123456789"
                          value={formData.insurance.policyNumber}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            insurance: { ...prev.insurance, policyNumber: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Data de Vencimento</label>
                        <Input
                          type="date"
                          value={formData.insurance.expiryDate}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            insurance: { ...prev.insurance, expiryDate: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Cobertura (R$)</label>
                        <Input
                          type="number"
                          placeholder="1000000"
                          value={formData.insurance.coverage || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            insurance: { ...prev.insurance, coverage: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Informações adicionais sobre o fornecedor..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-background border-t pt-4 flex gap-3">
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
                <Button type="submit" className="flex-1">
                  {editingSupplier ? 'Atualizar Fornecedor' : 'Criar Fornecedor'}
                </Button>
              </div>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}