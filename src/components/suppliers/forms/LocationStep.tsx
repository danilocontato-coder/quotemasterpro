import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Check, ChevronsUpDown, AlertCircle, Loader2 } from 'lucide-react';
import { LocationData } from './SupplierFormSchema';
import { brazilStates } from '@/data/brazilStates';
import { useToast } from '@/hooks/use-toast';

interface LocationStepProps {
  data: Partial<LocationData>;
  errors: Partial<Record<keyof LocationData, string>>;
  onChange: (field: keyof LocationData, value: string) => void;
}

export function LocationStep({ data, errors, onChange }: LocationStepProps) {
  const { toast } = useToast();
  const [stateOpen, setStateOpen] = React.useState(false);
  const [cityOpen, setCityOpen] = React.useState(false);
  const [loadingCEP, setLoadingCEP] = React.useState(false);
  const [cep, setCep] = React.useState('');

  const selectedState = brazilStates.find(state => state.code === data.state);
  const cities = selectedState?.cities || [];

  const handleStateSelect = (stateCode: string) => {
    onChange('state', stateCode);
    onChange('city', ''); // Reset city when state changes
    setStateOpen(false);
  };

  const handleCitySelect = (city: string) => {
    onChange('city', city);
    setCityOpen(false);
  };

  const handleCEPBlur = async () => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        setLoadingCEP(true);
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const viacepData = await response.json();
        
        if (!viacepData.erro) {
          // Buscar código do estado
          const state = brazilStates.find(s => s.code === viacepData.uf);
          
          if (state) {
            onChange('state', state.code);
            onChange('city', viacepData.localidade);
            
            // Atualizar endereço se necessário
            const currentAddress = data.address || '';
            const newAddress = [
              viacepData.logradouro,
              viacepData.bairro,
              currentAddress
            ].filter(Boolean).join(', ');
            
            if (viacepData.logradouro || viacepData.bairro) {
              onChange('address', newAddress);
            }
          }
          
          toast({
            title: 'CEP encontrado! ✅',
            description: 'Dados preenchidos automaticamente.'
          });
        } else {
          toast({
            title: 'CEP não encontrado',
            description: 'Verifique o CEP digitado.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível buscar o CEP.',
          variant: 'destructive'
        });
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Localização
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina a localização para otimizar o atendimento
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campo de CEP */}
        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm font-medium">
            CEP (Opcional)
          </Label>
          <div className="relative">
            <Input
              id="cep"
              value={cep}
              onChange={(e) => setCep(formatCEP(e.target.value))}
              onBlur={handleCEPBlur}
              placeholder="00000-000"
              maxLength={9}
              disabled={loadingCEP}
            />
            {loadingCEP && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Digite o CEP para preencher automaticamente cidade e estado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado *</Label>
            <Popover open={stateOpen} onOpenChange={setStateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={stateOpen}
                  className={`w-full justify-between ${errors.state ? "border-destructive" : ""}`}
                >
                  {selectedState?.name || "Selecione o estado..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar estado..." />
                  <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {brazilStates.map((state) => (
                      <CommandItem
                        key={state.code}
                        value={`${state.name} ${state.code}`}
                        onSelect={() => handleStateSelect(state.code)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            data.state === state.code ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {state.name} ({state.code})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.state && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.state}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Cidade *</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  className={`w-full justify-between ${errors.city ? "border-destructive" : ""} ${!data.state ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!data.state}
                >
                  {data.city || (data.state ? "Selecione a cidade..." : "Selecione o estado primeiro")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cidade..." />
                  <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {cities.map((city) => (
                      <CommandItem
                        key={city}
                        value={city}
                        onSelect={() => handleCitySelect(city)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            data.city === city ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.city && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.city}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium">
            Endereço Completo (Opcional)
          </Label>
          <Input
            id="address"
            value={data.address || ''}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Rua, número, bairro, CEP..."
            className={errors.address ? "border-destructive focus:border-destructive" : ""}
            maxLength={500}
          />
          {errors.address && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.address}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Informação adicional para facilitar localização e entregas
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Sobre localização</h4>
              <p className="text-xs text-blue-700 mt-1">
                A localização é importante para otimização de entregas e custos de frete. 
                Fornecedores próximos podem ter vantagens competitivas.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}