import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wrench, Plus, X, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { SpecialtiesData } from './SupplierFormSchema';

interface SpecialtiesStepProps {
  data: Partial<SpecialtiesData>;
  errors: Partial<Record<keyof SpecialtiesData, string>>;
  onChange: (field: keyof SpecialtiesData, value: string[]) => void;
}

const commonSpecialties = [
  'Materiais de Construção',
  'Produtos de Limpeza',
  'Elétrica e Iluminação',
  'Ferramentas',
  'Jardinagem e Paisagismo',
  'Serviços de Manutenção',
  'Segurança Patrimonial',
  'Alimentação e Bebidas',
  'Móveis e Decoração',
  'Pintura e Acabamento',
  'Hidráulica e Saneamento',
  'Climatização',
  'Equipamentos de Proteção',
  'Materiais de Escritório',
  'Tecnologia e Informática',
  'Serviços Gerais',
];

export function SpecialtiesStep({ data, errors, onChange }: SpecialtiesStepProps) {
  const [specialtyOpen, setSpecialtyOpen] = React.useState(false);
  const [customSpecialty, setCustomSpecialty] = React.useState('');

  const addSpecialty = (specialty: string) => {
    const trimmed = specialty.trim();
    if (trimmed && !data.specialties?.includes(trimmed)) {
      const newSpecialties = [...(data.specialties || []), trimmed];
      onChange('specialties', newSpecialties);
      setCustomSpecialty('');
      setSpecialtyOpen(false);
    }
  };

  const removeSpecialty = (specialty: string) => {
    const newSpecialties = (data.specialties || []).filter(s => s !== specialty);
    onChange('specialties', newSpecialties);
  };

  const addCustomSpecialty = () => {
    if (customSpecialty.trim()) {
      addSpecialty(customSpecialty);
    }
  };

  const availableSpecialties = commonSpecialties.filter(
    specialty => !(data.specialties || []).includes(specialty)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Especialidades
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione os produtos e serviços oferecidos pelo fornecedor
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Especialidades Selecionadas ({(data.specialties || []).length}/10)
          </Label>
          
          {(data.specialties || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(data.specialties || []).map((specialty) => (
                <Badge 
                  key={specialty} 
                  variant="secondary"
                  className="text-sm py-1 px-3 bg-primary/10 text-primary border-primary/20"
                >
                  {specialty}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeSpecialty(specialty)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground border border-dashed border-gray-200 rounded-lg p-4 text-center">
              Nenhuma especialidade selecionada
            </div>
          )}

          {errors.specialties && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.specialties}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Adicionar Especialidade</Label>
          
          <div className="flex gap-2">
            <Popover open={specialtyOpen} onOpenChange={setSpecialtyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="flex-1 justify-between"
                  disabled={(data.specialties || []).length >= 10}
                >
                  Selecionar especialidade comum
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar especialidade..." />
                  <CommandEmpty>Nenhuma especialidade encontrada.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {availableSpecialties.map((specialty) => (
                      <CommandItem
                        key={specialty}
                        value={specialty}
                        onSelect={() => addSpecialty(specialty)}
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        {specialty}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Input
              value={customSpecialty}
              onChange={(e) => setCustomSpecialty(e.target.value)}
              placeholder="Digite uma especialidade personalizada"
              onKeyPress={(e) => e.key === 'Enter' && addCustomSpecialty()}
              maxLength={50}
              disabled={(data.specialties || []).length >= 10}
            />
            <Button
              type="button"
              onClick={addCustomSpecialty}
              variant="outline"
              size="icon"
              disabled={!customSpecialty.trim() || (data.specialties || []).length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Máximo de 10 especialidades. Use nomes descritivos e específicos.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Wrench className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Dica para especialidades</h4>
              <p className="text-xs text-green-700 mt-1">
                Selecione especialidades específicas para que o fornecedor receba cotações 
                mais relevantes. Isso melhora a qualidade das propostas e a satisfação.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}