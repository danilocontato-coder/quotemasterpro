import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  is_system?: boolean;
  client_id?: string | null; // Nova coluna para segregação por cliente
}

export const useSupabaseCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Categories fetch error:', error);
        throw error;
      }
      
      setCategories((data as Category[]) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Don't show toast for network errors to avoid spam
      if (!(error as any)?.message?.includes('Failed to fetch')) {
        toast({
          title: "Erro ao carregar categorias",
          description: "Não foi possível carregar a lista de categorias.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (categoryData: { name: string; description?: string; color?: string }) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryData.name,
          description: categoryData.description || null,
          color: categoryData.color || '#3b82f6',
          created_by: authData.user.id,
          is_system: false,
          // client_id será automaticamente definido pelo trigger
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // unique violation
          toast({
            title: "Categoria já existe",
            description: "Uma categoria com este nome já foi cadastrada.",
            variant: "destructive"
          });
          return false;
        }
        throw error;
      }

      setCategories(prev => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Categoria criada",
        description: `A categoria "${categoryData.name}" foi criada com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Erro ao criar categoria",
        description: "Não foi possível criar a categoria.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Pick<Category, 'name' | 'description' | 'color'>>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => 
        prev.map(cat => cat.id === id ? { ...cat, ...data } : cat)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      
      toast({
        title: "Categoria atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Erro ao atualizar categoria",
        description: "Não foi possível atualizar a categoria.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCategory = async (id: string, categoryName: string) => {
    try {
      // Check if category is in use
      const { data: productsInCategory, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('category', categoryName);

      if (checkError) throw checkError;

      if (productsInCategory && productsInCategory.length > 0) {
        toast({
          title: "Categoria em uso",
          description: `Não é possível remover "${categoryName}" pois existem ${productsInCategory.length} produto(s) usando esta categoria.`,
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast({
        title: "Categoria removida",
        description: `A categoria "${categoryName}" foi removida com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Erro ao remover categoria",
        description: "Não foi possível remover a categoria.",
        variant: "destructive"
      });
      return false;
    }
  };

  const getCategoryUsageCount = async (categoryName: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('category', categoryName);

      if (error) {
        console.error('Category usage count error:', error);
        return 0;
      }
      return data?.length || 0;
    } catch (error) {
      console.error('Error getting category usage:', error);
      return 0;
    }
  };

  // Real-time subscription with error handling
  useEffect(() => {
    fetchCategories();
    
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          // Immediate update without debounce
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // No dependencies to prevent loops

  return {
    categories,
    isLoading,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryUsageCount
  };
};