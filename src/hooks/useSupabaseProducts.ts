import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit_price?: number;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'discontinued';
  supplier_id?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          suppliers(name),
          clients(name)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'CREATE_PRODUCT',
        entity_type: 'products',
        entity_id: data.id,
        details: { product_data: productData }
      }]);

      await fetchProducts();
      toast({
        title: "Produto criado",
        description: "Produto cadastrado com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Erro ao criar produto",
        description: "Não foi possível cadastrar o produto.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'UPDATE_PRODUCT',
        entity_type: 'products',
        entity_id: productId,
        details: { updates }
      }]);

      await fetchProducts();
      toast({
        title: "Produto atualizado",
        description: "Dados do produto atualizados com sucesso."
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erro ao atualizar produto",
        description: "Não foi possível atualizar os dados do produto.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateStock = async (productId: string, quantity: number, type: 'add' | 'subtract' | 'set') => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Produto não encontrado');

      let newQuantity: number;
      switch (type) {
        case 'add':
          newQuantity = product.stock_quantity + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, product.stock_quantity - quantity);
          break;
        case 'set':
          newQuantity = quantity;
          break;
      }

      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'UPDATE_STOCK',
        entity_type: 'products',
        entity_id: productId,
        details: { 
          old_quantity: product.stock_quantity,
          new_quantity: newQuantity,
          operation: type,
          change: quantity
        }
      }]);

      await fetchProducts();
      toast({
        title: "Estoque atualizado",
        description: "Quantidade em estoque foi atualizada com sucesso."
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Erro ao atualizar estoque",
        description: "Não foi possível atualizar o estoque do produto.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Real-time subscription
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
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    updateStock,
    refetch: fetchProducts
  };
};