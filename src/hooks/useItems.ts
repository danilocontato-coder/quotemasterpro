import { useState, useCallback } from 'react';
import { mockProducts } from '@/data/mockData';

interface Item {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  stockQuantity: number;
  unitPrice?: number;
  minStock?: number;
  type: 'product' | 'service';
  supplierId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  imported?: boolean;
  invoiceFile?: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  destination?: string;
  requester?: string;
  observations?: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
  createdBy: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'item' | 'stock_movement';
  entityId: string;
  details: any;
  timestamp: string;
}

export function useItems() {
  // Convert mockProducts to items format
  const initialItems: Item[] = mockProducts.map(product => ({
    ...product,
    type: product.category === 'Serviços' ? 'service' as const : 'product' as const,
    unitPrice: 0,
    minStock: 10,
    createdAt: new Date().toISOString(),
  }));

  const [items, setItems] = useState<Item[]>(initialItems);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const addAuditLog = useCallback((action: string, entityType: 'item' | 'stock_movement', entityId: string, details: any) => {
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      userId: 'current-user', // Would come from auth context
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [log, ...prev]);
  }, []);

  const createItem = useCallback((itemData: Omit<Item, 'id' | 'createdAt'>) => {
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);
    
    addAuditLog(
      'ITEM_CREATE',
      'item',
      newItem.id,
      {
        code: newItem.code,
        name: newItem.name,
        type: newItem.type,
        category: newItem.category,
        initialStock: newItem.stockQuantity,
      }
    );

    return newItem;
  }, [addAuditLog]);

  const updateItem = useCallback((itemId: string, updates: Partial<Item>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        
        addAuditLog(
          'ITEM_UPDATE',
          'item',
          itemId,
          {
            changes: updates,
            previousValues: Object.keys(updates).reduce((acc, key) => {
              acc[key] = item[key as keyof Item];
              return acc;
            }, {} as any),
          }
        );

        return updatedItem;
      }
      return item;
    }));
  }, [addAuditLog]);

  const deleteItem = useCallback((itemId: string, reason?: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setItems(prev => prev.filter(i => i.id !== itemId));
    
    addAuditLog(
      'ITEM_DELETE',
      'item',
      itemId,
      {
        deletedItem: {
          code: item.code,
          name: item.name,
          type: item.type,
          stockQuantity: item.stockQuantity,
        },
        reason: reason || 'Não informado',
      }
    );
  }, [items, addAuditLog]);

  const createStockMovement = useCallback((movement: Omit<StockMovement, 'id' | 'createdAt'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: `mov-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setStockMovements(prev => [newMovement, ...prev]);

    // Update item stock
    updateItem(movement.itemId, { stockQuantity: movement.newStock });

    addAuditLog(
      'STOCK_MOVEMENT',
      'stock_movement',
      newMovement.id,
      {
        itemCode: movement.itemCode,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        previousStock: movement.previousStock,
        newStock: movement.newStock,
        destination: movement.destination,
        requester: movement.requester,
      }
    );

    return newMovement;
  }, [updateItem, addAuditLog]);

  const importItems = useCallback((importedItems: Item[]) => {
    const processedItems = importedItems.map(item => ({
      ...item,
      id: `imported-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    }));

    setItems(prev => [...processedItems, ...prev]);

    // Create audit log for bulk import
    addAuditLog(
      'ITEMS_IMPORT',
      'item',
      'bulk-import',
      {
        importedCount: processedItems.length,
        items: processedItems.map(item => ({
          code: item.code,
          name: item.name,
          category: item.category,
          stockQuantity: item.stockQuantity,
        })),
        source: 'invoice_import',
      }
    );

    return processedItems;
  }, [addAuditLog]);

  const getItemsByCategory = useCallback((category: string) => {
    return items.filter(item => item.category === category);
  }, [items]);

  const getLowStockItems = useCallback((threshold: number = 10) => {
    return items.filter(item => 
      item.type === 'product' && 
      item.stockQuantity <= threshold
    );
  }, [items]);

  const getStockMovementsByItem = useCallback((itemId: string) => {
    return stockMovements.filter(movement => movement.itemId === itemId);
  }, [stockMovements]);

  const getAuditLogsByEntity = useCallback((entityType: 'item' | 'stock_movement', entityId: string) => {
    return auditLogs.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
  }, [auditLogs]);

  return {
    items,
    stockMovements,
    auditLogs,
    createItem,
    updateItem,
    deleteItem,
    createStockMovement,
    importItems,
    getItemsByCategory,
    getLowStockItems,
    getStockMovementsByItem,
    getAuditLogsByEntity,
  };
}