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
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch products for supplier
  const fetchProducts = useCallback(async () => {
    if (!user || !user.supplierId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', user.supplierId)
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
  }, [user, toast]);

  // Fetch stock movements
  const fetchStockMovements = useCallback(async () => {
    if (!user || !user.supplierId) return;

    try {
      // Since we don't have a stock_movements table, we'll create a simplified version
      // In a real implementation, you would create a proper stock_movements table
      const movements: StockMovement[] = [];
      setStockMovements(movements);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    }
  }, [user]);

  // Create product
  const createProduct = useCallback(async (productData: Omit<SupplierProduct, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user || !user.supplierId) return null;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          supplier_id: user.supplierId,
        })
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [{
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        category: data.category || undefined,
        unit_price: data.unit_price || undefined,
        stock_quantity: data.stock_quantity || 0,
        status: (data.status === 'active' || data.status === 'inactive') 
          ? data.status as 'active' | 'inactive' 
          : 'active',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      }, ...prev]);

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
  }, [user, toast]);

  // Update product
  const updateProduct = useCallback(async (id: string, updates: Partial<SupplierProduct>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('supplier_id', user.supplierId)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => prev.map(product => 
        product.id === id ? {
          ...product,
          ...updates,
          updated_at: data.updated_at || new Date().toISOString(),
        } : product
      ));

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
  }, [user, toast]);

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const product = products.find(p => p.id === id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('supplier_id', user.supplierId);

      if (error) throw error;

      setProducts(prev => prev.filter(product => product.id !== id));

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
  }, [user, products, toast]);

  // Update stock (simplified - in real app would use proper stock management)
  const updateStock = useCallback(async (
    productId: string, 
    newQuantity: number, 
    movementType: StockMovement['movement_type'],
    reason: string
  ) => {
    if (!user) return false;

    try {
      const product = products.find(p => p.id === productId);
      if (!product) return false;

      // Update product stock
      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', productId)
        .eq('supplier_id', user.supplierId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, stock_quantity: newQuantity } : p
      ));

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
  }, [user, products, toast]);

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

  // Fetch data on mount
  useEffect(() => {
    if (user?.supplierId) {
      fetchProducts();
      fetchStockMovements();
    }
  }, [fetchProducts, fetchStockMovements, user?.supplierId]);

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