import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SupplierProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit_price?: number;
  stock_quantity: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export const useSupabaseSupplierProducts = () => {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSupplierId, setCurrentSupplierId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let supplierId = user.supplierId || currentSupplierId;

    // Handle supplier without supplierId - try to find supplier record
    if (!supplierId) {
      console.log('⚠️ User missing supplierId in products, attempting to find supplier record...');
      
      try {
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (!supplierData || supplierError) {
          console.log('No supplier record found for products:', user.email);
          setIsLoading(false);
          setProducts([]);
          return;
        }

        // Use the found supplier ID and store it in state
        supplierId = supplierData.id;
        setCurrentSupplierId(supplierId);
        console.log('📦 Using found supplier ID for products:', supplierId);
      } catch (error) {
        console.error('Error in supplier lookup for products:', error);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching products for supplier:', supplierId);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and type-check the data properly
      const transformedProducts: SupplierProduct[] = (data || []).map(product => ({
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description || undefined,
        category: product.category || undefined,
        unit_price: product.unit_price || undefined,
        stock_quantity: product.stock_quantity || 0,
        status: (product.status === 'active' || product.status === 'inactive') 
          ? product.status as 'active' | 'inactive' 
          : 'active',
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || new Date().toISOString(),
      }));

      setProducts(transformedProducts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar produtos';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSupplierId, toast]);

  // Fetch stock movements
  const fetchStockMovements = useCallback(async () => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return;

    try {
      // Since we don't have a stock_movements table, we'll create a simplified version
      // In a real implementation, you would create a proper stock_movements table
      const movements: StockMovement[] = [];
      setStockMovements(movements);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    }
  }, [user, currentSupplierId]);

  // Create product
  const createProduct = useCallback(async (productData: Omit<SupplierProduct, 'id' | 'created_at' | 'updated_at'>) => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return null;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          supplier_id: supplierId,
        })
        .select()
        .single();

      if (error) throw error;

      // Don't update local state here - realtime subscription will handle it
      // This prevents duplicate entries

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'products',
        entity_id: data.id,
        panel_type: 'supplier',
        details: { 
          name: data.name,
          code: data.code,
          category: data.category
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Produto criado com sucesso',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar produto';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, currentSupplierId, toast]);

  // Update product
  const updateProduct = useCallback(async (id: string, updates: Partial<SupplierProduct>) => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return null;

    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('supplier_id', supplierId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state here - realtime subscription will handle it

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'UPDATE',
        entity_type: 'products',
        entity_id: id,
        panel_type: 'supplier',
        details: updates
      });

      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar produto';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, currentSupplierId, toast]);

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return false;

    try {
      const product = products.find(p => p.id === id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('supplier_id', supplierId);

      if (error) throw error;

      // Don't update local state here - realtime subscription will handle it

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'DELETE',
        entity_type: 'products',
        entity_id: id,
        panel_type: 'supplier',
        details: { 
          name: product?.name,
          code: product?.code
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Produto excluído com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir produto';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, currentSupplierId, products, toast]);

  // Update stock (simplified - in real app would use proper stock management)
  const updateStock = useCallback(async (
    productId: string, 
    newQuantity: number, 
    movementType: StockMovement['movement_type'],
    reason: string
  ) => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return false;

    try {
      const product = products.find(p => p.id === productId);
      if (!product) return false;

      // Update product stock
      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', productId)
        .eq('supplier_id', supplierId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state here - realtime subscription will handle it

      // Create stock movement record (simplified)
      const movement: StockMovement = {
        id: crypto.randomUUID(),
        product_id: productId,
        product_name: product.name,
        movement_type: movementType,
        quantity: Math.abs(newQuantity - product.stock_quantity),
        reason,
        created_at: new Date().toISOString(),
        created_by: user.id,
      };

      setStockMovements(prev => [movement, ...prev]);

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'STOCK_UPDATE',
        entity_type: 'products',
        entity_id: productId,
        panel_type: 'supplier',
        details: { 
          previous_stock: product.stock_quantity,
          new_stock: newQuantity,
          movement_type: movementType,
          reason
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Estoque atualizado com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar estoque';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, currentSupplierId, products, toast]);

  // Get low stock products
  const getLowStockProducts = useCallback((threshold: number = 10) => {
    return products.filter(product => 
      product.status === 'active' && product.stock_quantity <= threshold
    );
  }, [products]);

  // Get product categories
  const getCategories = useCallback(() => {
    const categories = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(categories) as string[];
  }, [products]);

  // Set up realtime subscription for products
  useEffect(() => {
    const supplierId = user?.supplierId || currentSupplierId;
    if (!user || !supplierId) return;

    fetchProducts();
    fetchStockMovements();

    // Subscribe to realtime changes for this supplier's products
    const channel = supabase
      .channel('supplier-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `supplier_id=eq.${supplierId}`,
        },
        (payload) => {
          console.log('📦 Product realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newProduct = payload.new as any;
            const transformedProduct: SupplierProduct = {
              id: newProduct.id,
              code: newProduct.code,
              name: newProduct.name,
              description: newProduct.description || undefined,
              category: newProduct.category || undefined,
              unit_price: newProduct.unit_price || undefined,
              stock_quantity: newProduct.stock_quantity || 0,
              status: (newProduct.status === 'active' || newProduct.status === 'inactive') 
                ? newProduct.status as 'active' | 'inactive' 
                : 'active',
              created_at: newProduct.created_at || new Date().toISOString(),
              updated_at: newProduct.updated_at || new Date().toISOString(),
            };

            setProducts(prev => {
              // Check if product already exists to avoid duplicates
              const exists = prev.find(p => p.id === transformedProduct.id);
              if (exists) return prev;
              return [transformedProduct, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProduct = payload.new as any;
            setProducts(prev => prev.map(product => 
              product.id === updatedProduct.id 
                ? {
                    ...product,
                    name: updatedProduct.name,
                    description: updatedProduct.description || undefined,
                    category: updatedProduct.category || undefined,
                    unit_price: updatedProduct.unit_price || undefined,
                    stock_quantity: updatedProduct.stock_quantity || 0,
                    status: updatedProduct.status as 'active' | 'inactive',
                    updated_at: updatedProduct.updated_at || new Date().toISOString(),
                  }
                : product
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedProduct = payload.old as any;
            setProducts(prev => prev.filter(product => product.id !== deletedProduct.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentSupplierId, fetchProducts, fetchStockMovements]);

  return {
    products,
    stockMovements,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStockProducts,
    getCategories,
    refetch: fetchProducts,
  };
};