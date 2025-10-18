import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import { SpecialtiesData } from './SupplierFormSchema';
import { SpecialtiesInput } from '@/components/common/SpecialtiesInput';

interface SpecialtiesStepProps {
  data: Partial<SpecialtiesData>;
  errors: Partial<Record<keyof SpecialtiesData, string>>;
  onChange: (field: keyof SpecialtiesData, value: string[]) => void;
}

export function SpecialtiesStep({ data, errors, onChange }: SpecialtiesStepProps) {
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
      <CardContent>
        <SpecialtiesInput
          value={data.specialties || []}
          onChange={(specialties) => onChange('specialties', specialties)}
          error={errors.specialties}
          maxSelections={10}
          allowCustom={true}
          showAsBadges={true}
          showTip={true}
        />
      </CardContent>
    </Card>
  );
}