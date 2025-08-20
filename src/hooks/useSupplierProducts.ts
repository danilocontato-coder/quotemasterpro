import { useState, useCallback, useMemo } from 'react';

export interface SupplierProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  stockQuantity: number;
  minStockLevel: number;
  unitPrice: number;
  costPrice?: number;
  brand?: string;
  specifications?: string;
  images: ProductImage[];
  status: 'active' | 'inactive';
  lastUpdated: string;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: string;
  createdBy: string; // user id
}

// Mock data
const mockProducts: SupplierProduct[] = [
  {
    id: '1',
    code: 'MAT001',
    name: 'Cimento Portland 50kg',
    description: 'Cimento Portland comum para construção civil',
    category: 'Materiais de Construção',
    stockQuantity: 150,
    minStockLevel: 20,
    unitPrice: 32.50,
    costPrice: 28.00,
    brand: 'Votoran',
    specifications: 'CP II-E-32, saco de 50kg',
    images: [
      {
        id: '1',
        url: '/api/placeholder/300/200',
        alt: 'Cimento Portland 50kg',
        isPrimary: true,
        uploadedAt: '2025-08-18T10:30:00Z'
      }
    ],
    status: 'active',
    lastUpdated: '2025-08-18T10:30:00Z',
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: '2',
    code: 'MAT002',
    name: 'Areia Fina (m³)',
    description: 'Areia fina lavada para construção',
    category: 'Materiais de Construção',
    stockQuantity: 25,
    minStockLevel: 5,
    unitPrice: 85.00,
    costPrice: 70.00,
    images: [],
    status: 'active',
    lastUpdated: '2025-08-17T14:20:00Z',
    createdAt: '2025-01-20T09:15:00Z'
  },
  {
    id: '3',
    code: 'FER001',
    name: 'Furadeira de Impacto',
    description: 'Furadeira de impacto 1/2" 650W',
    category: 'Ferramentas',
    stockQuantity: 0,
    minStockLevel: 2,
    unitPrice: 280.00,
    costPrice: 220.00,
    brand: 'Bosch',
    specifications: '650W, mandril 1/2", velocidade variável',
    images: [],
    status: 'inactive',
    lastUpdated: '2025-08-10T11:20:00Z',
    createdAt: '2025-02-01T14:30:00Z'
  }
];

const mockStockMovements: StockMovement[] = [
  {
    id: '1',
    productId: '1',
    type: 'in',
    quantity: 50,
    reason: 'Compra de estoque',
    notes: 'Pedido #1234',
    createdAt: '2025-08-15T14:30:00Z',
    createdBy: 'current-supplier'
  },
  {
    id: '2',
    productId: '1',
    type: 'out',
    quantity: 25,
    reason: 'Venda',
    notes: 'Cotação RFQ009',
    createdAt: '2025-08-16T10:15:00Z',
    createdBy: 'current-supplier'
  }
];

let productsStore: SupplierProduct[] = [...mockProducts];
let stockMovementsStore: StockMovement[] = [...mockStockMovements];
let productCounter = 4;

export const useSupplierProducts = () => {
  const [products, setProducts] = useState<SupplierProduct[]>(productsStore);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(stockMovementsStore);
  const [isLoading, setIsLoading] = useState(false);

  const generateProductCode = useCallback(() => {
    const id = `PROD${String(productCounter).padStart(3, '0')}`;
    productCounter++;
    return id;
  }, []);

  const addProduct = useCallback(async (productData: Omit<SupplierProduct, 'id' | 'code' | 'createdAt' | 'lastUpdated'>) => {
    setIsLoading(true);
    try {
      const newProduct: SupplierProduct = {
        ...productData,
        id: crypto.randomUUID(),
        code: generateProductCode(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      productsStore = [newProduct, ...productsStore];
      setProducts([...productsStore]);
      return newProduct;
    } finally {
      setIsLoading(false);
    }
  }, [generateProductCode]);

  const updateProduct = useCallback(async (id: string, updates: Partial<SupplierProduct>) => {
    setIsLoading(true);
    try {
      productsStore = productsStore.map(product =>
        product.id === id
          ? { ...product, ...updates, lastUpdated: new Date().toISOString() }
          : product
      );
      setProducts([...productsStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      productsStore = productsStore.filter(product => product.id !== id);
      setProducts([...productsStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleProductStatus = useCallback(async (id: string) => {
    const product = productsStore.find(p => p.id === id);
    if (!product) return;

    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    await updateProduct(id, { status: newStatus });
  }, [updateProduct]);

  const addStockMovement = useCallback(async (productId: string, movement: Omit<StockMovement, 'id' | 'productId' | 'createdAt' | 'createdBy'>) => {
    setIsLoading(true);
    try {
      const newMovement: StockMovement = {
        ...movement,
        id: crypto.randomUUID(),
        productId,
        createdAt: new Date().toISOString(),
        createdBy: 'current-supplier', // In real app, get from auth context
      };

      stockMovementsStore = [newMovement, ...stockMovementsStore];
      setStockMovements([...stockMovementsStore]);

      // Update product stock
      const product = productsStore.find(p => p.id === productId);
      if (product) {
        let newQuantity = product.stockQuantity;
        
        if (movement.type === 'in') {
          newQuantity += movement.quantity;
        } else if (movement.type === 'out') {
          newQuantity = Math.max(0, newQuantity - movement.quantity);
        } else if (movement.type === 'adjustment') {
          newQuantity = movement.quantity;
        }

        await updateProduct(productId, { stockQuantity: newQuantity });
      }

      return newMovement;
    } finally {
      setIsLoading(false);
    }
  }, [updateProduct]);

  const addProductImage = useCallback(async (productId: string, file: File) => {
    setIsLoading(true);
    try {
      // Mock file upload - in real app, this would upload to Supabase Storage
      const newImage: ProductImage = {
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file), // Mock URL
        alt: file.name,
        isPrimary: false,
        uploadedAt: new Date().toISOString(),
      };

      const product = productsStore.find(p => p.id === productId);
      if (product) {
        const updatedImages = [...product.images, newImage];
        await updateProduct(productId, { images: updatedImages });
      }

      return newImage;
    } finally {
      setIsLoading(false);
    }
  }, [updateProduct]);

  const removeProductImage = useCallback(async (productId: string, imageId: string) => {
    const product = productsStore.find(p => p.id === productId);
    if (product) {
      const updatedImages = product.images.filter(img => img.id !== imageId);
      await updateProduct(productId, { images: updatedImages });
    }
  }, [updateProduct]);

  const setPrimaryImage = useCallback(async (productId: string, imageId: string) => {
    const product = productsStore.find(p => p.id === productId);
    if (product) {
      const updatedImages = product.images.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));
      await updateProduct(productId, { images: updatedImages });
    }
  }, [updateProduct]);

  const getProductById = useCallback((id: string) => {
    return products.find(product => product.id === id);
  }, [products]);

  const getStockMovements = useCallback((productId: string) => {
    return stockMovements.filter(movement => movement.productId === productId);
  }, [stockMovements]);

  const getLowStockProducts = useMemo(() => {
    return products.filter(product => 
      product.status === 'active' && 
      product.stockQuantity <= product.minStockLevel && 
      product.stockQuantity > 0
    );
  }, [products]);

  const getOutOfStockProducts = useMemo(() => {
    return products.filter(product => 
      product.status === 'active' && 
      product.stockQuantity === 0
    );
  }, [products]);

  const categoriesList = useMemo(() => {
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  return {
    products,
    stockMovements,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    addStockMovement,
    addProductImage,
    removeProductImage,
    setPrimaryImage,
    getProductById,
    getStockMovements,
    lowStockProducts: getLowStockProducts,
    outOfStockProducts: getOutOfStockProducts,
    categories: categoriesList,
  };
};