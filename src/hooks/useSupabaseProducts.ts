import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  created_at: string;
  updated_at: string;
}

export const useSupabaseProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
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
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Real-time INSERT:', payload.new);
          setProducts(prev => {
            const exists = prev.find(p => p.id === payload.new.id);
            if (exists) return prev; // Evita duplicação do real-time
            return [...prev, payload.new as Product].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Real-time UPDATE:', payload.new);
          setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Real-time DELETE:', payload.old);
          setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // No dependencies to prevent loops

  const generateUniqueCode = async (baseCode?: string): Promise<string> => {
    const prefix = baseCode || 'PROD';
    let counter = 1;
    let code = `${prefix}${counter.toString().padStart(3, '0')}`;
    
    // Check if code exists
    while (true) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      
      if (!existing) {
        return code;
      }
      
      counter++;
      code = `${prefix}${counter.toString().padStart(3, '0')}`;
      
      // Safety check to avoid infinite loop
      if (counter > 9999) {
        code = `${prefix}${Date.now()}`;
        break;
      }
    }
    
    return code;
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error('User not authenticated');

      // Get user profile to determine client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id, role')
        .eq('id', authData.user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // For admins, allow creating products without client/supplier association
      // For clients/managers/collaborators, require client_id
      // For suppliers, require supplier_id
      let productPayload = { ...productData };
      
      // Se o código foi fornecido em branco ou vazio, removê-lo para usar o default do DB
      if (!productPayload.code || productPayload.code.trim() === '') {
        delete productPayload.code;
      } else {
        // Se foi fornecido um código, verificar se já existe
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('code', productPayload.code.trim())
          .maybeSingle();
        
        if (existing) {
          // Código já existe, vamos removê-lo para usar o default do DB
          delete productPayload.code;
        }
      }
      
      if (profile.role === 'admin') {
        // Admin products require supplier association only
        if (profile.supplier_id) productPayload.supplier_id = profile.supplier_id;
        if (!productPayload.supplier_id && user?.supplierId) productPayload.supplier_id = user.supplierId;
        if (!productPayload.supplier_id) {
          throw new Error('Usuário administrador deve estar associado a um fornecedor para cadastrar produtos.');
        }
      } else if (['manager', 'collaborator'].includes(profile.role)) {
        throw new Error('Clientes não podem criar produtos diretamente. Use fornecedores para isso.');
      } else if (profile.role === 'supplier') {
        productPayload.supplier_id = profile.supplier_id || user?.supplierId || null;
        if (!productPayload.supplier_id) {
          throw new Error('Perfil de usuário não está associado a um fornecedor');
        }
      }

      // Ensure types are correct for Supabase
      const finalPayload = {
        ...productPayload,
        supplier_id: productPayload.supplier_id || null
      } as any; // Type assertion to bypass strict typing

      const { data, error } = await supabase
        .from('products')
        .insert(finalPayload)
        .select()
        .single();

      if (error) throw error;

      console.log('Product created successfully:', data);
      
      // Update local state immediately for better UX - mais robusta
      setProducts(prev => {
        const exists = prev.find(p => p.id === data.id);
        if (exists) return prev; // Evita duplicação
        return [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name));
      });
      
      toast({
        title: "Produto criado",
        description: `O produto "${data.name}" foi criado com sucesso. Código: ${data.code}`,
      });
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro ao criar produto",
        description: (error as any)?.message ? String((error as any).message) : "Não foi possível criar o produto.",
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
      console.log('Attempting to delete product:', id, productName);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Product deleted successfully:', id);
      
      // Update local state immediately for better UX
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
    updateStock,
    generateUniqueCode
  };
};