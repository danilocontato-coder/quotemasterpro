import { describe, it, expect } from 'vitest';
import { STANDARD_SPECIALTIES } from '@/components/common/SpecialtiesInput';
import { supplierSpecialties } from '@/data/mockData';

describe('Data Consistency - Specialties', () => {
  describe('Source of Truth', () => {
    it('should have only one source of truth for specialties', () => {
      // Verificar que supplierSpecialties aponta para STANDARD_SPECIALTIES
      expect(supplierSpecialties).toEqual(STANDARD_SPECIALTIES);
    });

    it('should export STANDARD_SPECIALTIES correctly', () => {
      expect(STANDARD_SPECIALTIES).toBeDefined();
      expect(Array.isArray(STANDARD_SPECIALTIES)).toBe(true);
    });
  });

  describe('Data Quality', () => {
    it('should not have duplicate specialties in STANDARD_SPECIALTIES', () => {
      const unique = new Set(STANDARD_SPECIALTIES);
      expect(unique.size).toBe(STANDARD_SPECIALTIES.length);
    });

    it('should have reasonable number of specialties (not empty, not too many)', () => {
      expect(STANDARD_SPECIALTIES.length).toBeGreaterThan(10);
      expect(STANDARD_SPECIALTIES.length).toBeLessThan(50);
    });

    it('should have all specialties as non-empty strings', () => {
      STANDARD_SPECIALTIES.forEach(specialty => {
        expect(specialty).toBeTruthy();
        expect(typeof specialty).toBe('string');
        expect(specialty.trim().length).toBeGreaterThan(0);
      });
    });

    it('should not have specialties with only whitespace', () => {
      STANDARD_SPECIALTIES.forEach(specialty => {
        expect(specialty.trim()).toBe(specialty);
      });
    });
  });

  describe('Naming Conventions', () => {
    it('should have specialties with proper capitalization', () => {
      STANDARD_SPECIALTIES.forEach(specialty => {
        // Primeira letra deve ser maiúscula
        expect(specialty[0]).toBe(specialty[0].toUpperCase());
      });
    });

    it('should not have specialties ending with punctuation', () => {
      const punctuation = ['.', ',', ';', ':', '!', '?'];
      STANDARD_SPECIALTIES.forEach(specialty => {
        const lastChar = specialty[specialty.length - 1];
        expect(punctuation).not.toContain(lastChar);
      });
    });
  });

  describe('Business Rules', () => {
    it('should have core categories present', () => {
      const coreCategories = [
        'Materiais de Construção',
        'Produtos de Limpeza',
        'Elétrica e Iluminação',
        'Serviços de Manutenção'
      ];

      coreCategories.forEach(category => {
        expect(STANDARD_SPECIALTIES).toContain(category);
      });
    });

    it('should not have overly generic categories', () => {
      const tooGeneric = ['Outros', 'Diversos', 'Vários', 'Geral'];
      
      STANDARD_SPECIALTIES.forEach(specialty => {
        const lowerSpecialty = specialty.toLowerCase();
        tooGeneric.forEach(generic => {
          // Permitir apenas se for parte de nome composto (ex: "Serviços Gerais")
          if (lowerSpecialty === generic.toLowerCase()) {
            expect(specialty).not.toBe(generic);
          }
        });
      });
    });
  });

  describe('Integration Points', () => {
    it('should be importable from common component', () => {
      expect(() => {
        const { STANDARD_SPECIALTIES: imported } = require('@/components/common/SpecialtiesInput');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });

    it('should match between old and new import', () => {
      // Esta propriedade garante retrocompatibilidade
      expect(supplierSpecialties).toBe(STANDARD_SPECIALTIES);
    });
  });

  describe('Performance', () => {
    it('should have reasonable array size for UI performance', () => {
      // Mais de 100 opções pode degradar UX de dropdowns
      expect(STANDARD_SPECIALTIES.length).toBeLessThan(100);
    });

    it('should not have excessively long specialty names', () => {
      STANDARD_SPECIALTIES.forEach(specialty => {
        // Nomes muito longos quebram layout
        expect(specialty.length).toBeLessThan(100);
      });
    });
  });
});

describe('Data Consistency - Mock Data', () => {
  it('should have supplierSpecialties deprecated correctly', () => {
    // Verificar que a depreciação está funcionando
    expect(supplierSpecialties).toBeDefined();
    expect(supplierSpecialties).toBe(STANDARD_SPECIALTIES);
  });
});
