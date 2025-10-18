import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, AlertCircle, Wrench } from 'lucide-react';

export const STANDARD_SPECIALTIES = [
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
  'Marcenaria',
  'Alvenaria',
  'Serviços Gerais',
];

interface SpecialtiesInputProps {
  value: string[];
  onChange: (specialties: string[]) => void;
  maxSelections?: number;
  allowCustom?: boolean;
  error?: string;
  showAsBadges?: boolean;
  label?: string;
  description?: string;
  showTip?: boolean;
}

export function SpecialtiesInput({
  value = [],
  onChange,
  maxSelections = 10,
  allowCustom = true,
  error,
  showAsBadges = true,
  label = 'Especialidades',
  description = 'Selecione os produtos e serviços oferecidos',
  showTip = true,
}: SpecialtiesInputProps) {
  const [customSpecialty, setCustomSpecialty] = useState('');

  const toggleSpecialty = (specialty: string) => {
    if (value.includes(specialty)) {
      onChange(value.filter((s) => s !== specialty));
    } else {
      if (value.length < maxSelections) {
        onChange([...value, specialty]);
      }
    }
  };

  const removeSpecialty = (specialty: string) => {
    onChange(value.filter((s) => s !== specialty));
  };

  const addCustomSpecialty = () => {
    const trimmed = customSpecialty.trim();
    if (trimmed && !value.includes(trimmed) && value.length < maxSelections) {
      onChange([...value, trimmed]);
      setCustomSpecialty('');
    }
  };

  const isMaxReached = value.length >= maxSelections;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          {label}
          {value.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({value.length}/{maxSelections})
            </span>
          )}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Selected Specialties - Badges View */}
      {showAsBadges && value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Selecionadas
          </Label>
          <div className="flex flex-wrap gap-2">
            {value.map((specialty) => (
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
        </div>
      )}

      {/* Common Specialties - Checkboxes */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Especialidades Comuns
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
          {STANDARD_SPECIALTIES.map((specialty) => (
            <div
              key={specialty}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={`specialty-${specialty}`}
                checked={value.includes(specialty)}
                onCheckedChange={() => toggleSpecialty(specialty)}
                disabled={isMaxReached && !value.includes(specialty)}
              />
              <Label
                htmlFor={`specialty-${specialty}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {specialty}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Specialty Input */}
      {allowCustom && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Adicionar Especialidade Personalizada
          </Label>
          <div className="flex gap-2">
            <Input
              value={customSpecialty}
              onChange={(e) => setCustomSpecialty(e.target.value)}
              placeholder="Digite uma especialidade personalizada"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialty())}
              maxLength={50}
              disabled={isMaxReached}
            />
            <Button
              type="button"
              onClick={addCustomSpecialty}
              variant="outline"
              size="icon"
              disabled={!customSpecialty.trim() || isMaxReached}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Máximo de {maxSelections} especialidades. Use nomes descritivos e específicos.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!showAsBadges && value.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed border-gray-200 rounded-lg p-4 text-center">
          Nenhuma especialidade selecionada
        </div>
      )}

      {/* Tip */}
      {showTip && (
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
      )}
    </div>
  );
}
