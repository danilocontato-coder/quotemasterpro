import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Supplier } from "@/hooks/useSupabaseSuppliers";
import { brazilStates } from '@/data/brazilStates';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => Promise<any>;
  editingSupplier?: any;
}

export function CreateSupplierModal({ open, onClose, onCreateSupplier, editingSupplier }: CreateSupplierModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state simplificado
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    business_info: {},
    specialties: [] as string[],
    type: 'local' as 'local' | 'certified',
    region: '',
    state: '',
    city: '',
    visibility_scope: 'region' as 'region' | 'global',
    status: 'active' as 'pending' | 'active' | 'inactive' | 'suspended',
    subscription_plan_id: 'plan-basic',
    client_id: null,
    is_certified: false,
    certification_date: null,
    certification_expires_at: null
  });

  const [selectedState, setSelectedState] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Reset form - FUNÇÃO SIMPLES
  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      },
      business_info: {},
      specialties: [],
      type: 'local',
      region: '',
      state: '',
      city: '',
      visibility_scope: 'region',
      status: 'active',
      subscription_plan_id: 'plan-basic',
      client_id: null,
      is_certified: false,
      certification_date: null,
      certification_expires_at: null
    });
    setSelectedState('');
    setAvailableCities([]);
  };

  // Load editing data - SIMPLES e CONTROLADO
  useEffect(() => {
    if (!open) return;
    
    if (editingSupplier) {
      console.log('📝 Loading edit data for:', editingSupplier.name);
      
      setFormData({
        name: editingSupplier.name || '',
        cnpj: editingSupplier.cnpj || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        whatsapp: editingSupplier.whatsapp || '',
        website: editingSupplier.website || '',
        address: editingSupplier.address || {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        },
        business_info: editingSupplier.business_info || {},
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        region: editingSupplier.region || '',
        state: editingSupplier.state || '',
        city: editingSupplier.city || '',
        visibility_scope: editingSupplier.visibility_scope || 'region',
        status: editingSupplier.status || 'active',
        subscription_plan_id: editingSupplier.subscription_plan_id || 'plan-basic',
        client_id: editingSupplier.client_id || null,
        is_certified: editingSupplier.is_certified || false,
        certification_date: editingSupplier.certification_date || null,
        certification_expires_at: editingSupplier.certification_expires_at || null
      });
      
      // Set state for form
      if (editingSupplier.state) {
        const state = brazilStates.find(s => s.name === editingSupplier.state);
        if (state) {
          setSelectedState(state.code);
          setAvailableCities(state.cities);
        }
      }
    } else {
      resetForm();
    }
  }, [open, editingSupplier]);

  // Handle state change
  const handleStateChange = (stateCode: string) => {
    const state = brazilStates.find(s => s.code === stateCode);
    if (state) {
      setSelectedState(stateCode);
      setAvailableCities(state.cities);
      setFormData(prev => ({
        ...prev,
        state: state.name,
        region: getRegionFromState(stateCode),
        city: ''
      }));
    }
  };

  const getRegionFromState = (stateCode: string) => {
    const regions: { [key: string]: string } = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    return regions[stateCode] || '';
  };

  // Handle submit - SIMPLES e PROTEGIDO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // PREVENT MULTIPLE CALLS
    if (isLoading) {
      console.log('⚠️ Submit already in progress, ignoring...');
      return;
    }
    
    setIsLoading(true);
    console.log('🔄 Submit started');

    try {
      // Validate
      if (!formData.name || !formData.email || !formData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome, email e CNPJ são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (!formData.whatsapp) {
        toast({
          title: "WhatsApp obrigatório",
          description: "O WhatsApp é necessário para envio de cotações.",
          variant: "destructive"
        });
        return;
      }

      console.log('📤 Calling onCreateSupplier...');
      await onCreateSupplier(formData);
      console.log('✅ onCreateSupplier completed');
      
      toast({
        title: editingSupplier ? "Fornecedor atualizado" : "Fornecedor criado",
        description: `${formData.name} foi ${editingSupplier ? 'atualizado' : 'criado'} com sucesso.`
      });

      resetForm();
      onClose();
      console.log('✅ Modal closed');
    } catch (error) {
      console.error('❌ Error in submit:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o fornecedor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {editingSupplier ? 'Editar Fornecedor' : 'Criar Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>

                <div>
                  <Label>CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                    required
                  />
                </div>

                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="+55 11 99999-0000"
                    required
                  />
                </div>

                <div>
                  <Label>Estado *</Label>
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilStates.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cidade *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    disabled={!selectedState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedState ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.name || !formData.email || !formData.cnpj || !formData.whatsapp}
                >
                  {isLoading ? 'Salvando...' : (editingSupplier ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  );
}