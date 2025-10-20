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
  client_id?: string | null;
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
      
      console.log('[useSupabaseProducts] 🔍 Iniciando busca de produtos:', {
        userId: user?.id,
        userRole: user?.role,
        clientId: user?.clientId,
        supplierId: user?.supplierId
      });
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[useSupabaseProducts] ❌ Erro na busca:', error);
        throw error;
      }
      
      console.log('[useSupabaseProducts] 📦 Produtos retornados do banco (antes do filtro):', {
        total: data?.length || 0,
        produtos: data?.map(p => ({
          id: p.id,
          name: p.name,
          code: p.code,
          client_id: p.client_id,
          supplier_id: p.supplier_id
        }))
      });
      
      // Filtro adicional no frontend para garantir isolamento
      let filteredData = data || [];
      
      if (user?.role === 'manager' || user?.role === 'collaborator' || user?.role === 'client') {
        // Para clientes/administradoras: mostrar apenas produtos do próprio cliente
        filteredData = data?.filter(p => p.client_id === user.clientId) || [];
        
        console.log('[useSupabaseProducts] 🔒 Aplicado filtro de cliente:', {
          clientId: user.clientId,
          antesDoFiltro: data?.length || 0,
          depoisDoFiltro: filteredData.length
        });
      } else if (user?.role === 'supplier') {
        // Para fornecedores: mostrar apenas produtos do próprio fornecedor
        filteredData = data?.filter(p => p.supplier_id === user.supplierId) || [];
        
        console.log('[useSupabaseProducts] 🔒 Aplicado filtro de fornecedor:', {
          supplierId: user.supplierId,
          antesDoFiltro: data?.length || 0,
          depoisDoFiltro: filteredData.length
        });
      }
      
      console.log('[useSupabaseProducts] ✅ Produtos finais (após filtros):', filteredData.length);
      setProducts((filteredData as Product[]) || []);
    } catch (error) {
      console.error('[useSupabaseProducts] 💥 Exceção ao buscar produtos:', error);
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
          console.log('[useSupabaseProducts] 🔄 Real-time INSERT:', payload.new);
          
          // Aplicar filtro de isolamento antes de adicionar
          const newProduct = payload.new as Product;
          let shouldAdd = false;
          
          if (user?.role === 'manager' || user?.role === 'collaborator' || user?.role === 'client') {
            shouldAdd = newProduct.client_id === user.clientId;
          } else if (user?.role === 'supplier') {
            shouldAdd = newProduct.supplier_id === user.supplierId;
          } else if (user?.role === 'admin') {
            shouldAdd = true;
          }
          
          if (shouldAdd) {
            setProducts(prev => {
              const exists = prev.find(p => p.id === newProduct.id);
              if (exists) return prev; // Evita duplicação do real-time
              return [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name));
            });
          }
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
          console.log('[useSupabaseProducts] 🔄 Real-time UPDATE:', payload.new);
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
          console.log('[useSupabaseProducts] 🔄 Real-time DELETE:', payload.old);
          setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[useSupabaseProducts] 📡 Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.clientId, user?.supplierId, user?.role]); // Adicionar dependências do usuário

  // Geração de código agora é automática via trigger no banco de dados

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
      
      // Remover código para usar geração automática via trigger do banco
      delete productPayload.code;
      
      if (profile.role === 'admin') {
        // Admin must be associated to some scope due to RLS no-orphans policy
        if (profile.client_id) productPayload.client_id = profile.client_id;
        if (profile.supplier_id) productPayload.supplier_id = profile.supplier_id;
        // Fallback to AuthContext if profile has no association
        if (!productPayload.client_id && !productPayload.supplier_id) {
          if (user?.clientId) productPayload.client_id = user.clientId;
          if (!productPayload.client_id && user?.supplierId) productPayload.supplier_id = user.supplierId;
        }
        if (!productPayload.client_id && !productPayload.supplier_id) {
          throw new Error('Usuário administrador sem associação a cliente/fornecedor. Vincule um cliente ou fornecedor para cadastrar produtos.');
        }
      } else if (['manager', 'collaborator'].includes(profile.role)) {
        productPayload.client_id = profile.client_id || user?.clientId || null;
        if (!productPayload.client_id) {
          throw new Error('Perfil de usuário não está associado a um cliente');
        }
        // Para clientes, o supplier_id pode ser null (produto criado pelo cliente)
        productPayload.supplier_id = null;
      } else if (profile.role === 'supplier') {
        productPayload.supplier_id = profile.supplier_id || user?.supplierId || null;
        if (!productPayload.supplier_id) {
          throw new Error('Perfil de usuário não está associado a um fornecedor');
        }
      }

      // Ensure types are correct for Supabase
      const finalPayload = {
        ...productPayload,
        supplier_id: productPayload.supplier_id || null,
        client_id: productPayload.client_id || null
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
    updateStock
  };
};