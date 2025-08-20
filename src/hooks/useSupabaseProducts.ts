import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit_price?: number | null;
  stock_quantity: number | null;
  status: string;
  supplier_id?: string | null;
  client_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupabaseProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Products fetch error:', error);
        throw error;
      }
      
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Don't show toast for network errors to avoid spam
      if (!(error as any)?.message?.includes('Failed to fetch')) {
        toast({
          title: "Erro ao carregar produtos",
          description: "Não foi possível carregar a lista de produtos.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription with error handling
  useEffect(() => {
    fetchProducts();
    
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          // Debounce real-time updates
          setTimeout(() => {
            fetchProducts();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // No dependencies to prevent loops

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      // Get user profile to determine client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id')
        .eq('id', user.user.id)
        .single();

      if (!profile?.client_id && !profile?.supplier_id) {
        throw new Error('User profile not found or missing client/supplier association');
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          client_id: profile.client_id,
          supplier_id: profile.supplier_id,
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Produto criado",
        description: `O produto "${productData.name}" foi criado com sucesso.`,
      });
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro ao criar produto",
        description: "Não foi possível criar o produto.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => 
        prev.map(product => product.id === id ? { ...product, ...data as Product } : product)
      );
      
      toast({
        title: "Produto atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erro ao atualizar produto",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteProduct = async (id: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'discontinued' })
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.filter(product => product.id !== id));
      toast({
        title: "Produto removido",
        description: `O produto "${productName}" foi removido com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro ao remover produto",
        description: "Não foi possível remover o produto.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateStock = async (id: string, quantity: number, movement: 'add' | 'subtract', reason?: string) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Produto não encontrado');

      const currentStock = product.stock_quantity || 0;
      const newQuantity = movement === 'add' 
        ? currentStock + quantity 
        : Math.max(0, currentStock - quantity);

      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => 
        prev.map(p => p.id === id ? { ...p, stock_quantity: newQuantity } : p)
      );
      
      toast({
        title: "Estoque atualizado",
        description: `Estoque do produto "${product.name}" foi ${movement === 'add' ? 'aumentado' : 'reduzido'}.`,
      });
      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Erro ao atualizar estoque",
        description: "Não foi possível atualizar o estoque.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    products,
    isLoading,
    refetch: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock
  };
};