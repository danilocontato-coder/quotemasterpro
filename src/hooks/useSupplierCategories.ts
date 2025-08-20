import { useState, useCallback } from 'react';

export interface SupplierCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockCategories: SupplierCategory[] = [
  {
    id: '1',
    name: 'Materiais de Construção',
    description: 'Cimento, areia, brita e outros materiais básicos',
    color: '#3B82F6',
    productCount: 2,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-15T08:00:00Z',
  },
  {
    id: '2',
    name: 'Ferramentas',
    description: 'Ferramentas manuais e elétricas',
    color: '#EF4444',
    productCount: 1,
    createdAt: '2025-01-20T10:30:00Z',
    updatedAt: '2025-01-20T10:30:00Z',
  },
  {
    id: '3',
    name: 'Elétrica e Iluminação',
    description: 'Produtos elétricos, cabos e lâmpadas',
    color: '#F59E0B',
    productCount: 0,
    createdAt: '2025-02-01T14:15:00Z',
    updatedAt: '2025-02-01T14:15:00Z',
  },
];

let categoriesStore: SupplierCategory[] = [...mockCategories];
let categoryCounter = 4;

export const useSupplierCategories = () => {
  const [categories, setCategories] = useState<SupplierCategory[]>(categoriesStore);
  const [isLoading, setIsLoading] = useState(false);

  const addCategory = useCallback(async (categoryData: Omit<SupplierCategory, 'id' | 'productCount' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      const newCategory: SupplierCategory = {
        ...categoryData,
        id: categoryCounter.toString(),
        productCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      categoryCounter++;
      categoriesStore = [newCategory, ...categoriesStore];
      setCategories([...categoriesStore]);
      
      return newCategory;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<SupplierCategory>) => {
    setIsLoading(true);
    try {
      categoriesStore = categoriesStore.map(category =>
        category.id === id
          ? { ...category, ...updates, updatedAt: new Date().toISOString() }
          : category
      );
      setCategories([...categoriesStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      categoriesStore = categoriesStore.filter(category => category.id !== id);
      setCategories([...categoriesStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCategoryById = useCallback((id: string) => {
    return categoriesStore.find(category => category.id === id);
  }, []);

  const getCategoriesWithProducts = useCallback(() => {
    return categoriesStore.filter(category => category.productCount > 0);
  }, []);

  const updateProductCount = useCallback(async (categoryId: string, count: number) => {
    await updateCategory(categoryId, { productCount: count });
  }, [updateCategory]);

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoriesWithProducts,
    updateProductCount,
  };
};