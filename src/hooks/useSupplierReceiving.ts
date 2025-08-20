import { useState, useEffect } from 'react';

interface Delivery {
  id: string;
  quoteId: string;
  clientName: string;
  status: 'pending' | 'partial' | 'completed';
  expectedDate: string;
  lastUpdate: string;
  items: DeliveryItem[];
}

interface DeliveryItem {
  id: string;
  description: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  serialNumber?: string;
}

interface DeliveryRegistration {
  deliveredQuantity: number;
  serialNumber?: string;
  comments: string;
  attachments: string[];
}

const mockDeliveries: Delivery[] = [
  {
    id: 'DEL-001',
    quoteId: 'RFQ-2024-001',
    clientName: 'Condomínio Azul',
    status: 'pending',
    expectedDate: '25/01/2024',
    lastUpdate: '15/01/2024',
    items: [
      {
        id: '1',
        description: 'Detergente neutro 5L',
        orderedQuantity: 10,
        deliveredQuantity: 0
      },
      {
        id: '2',
        description: 'Desinfetante 1L',
        orderedQuantity: 20,
        deliveredQuantity: 0
      }
    ]
  },
  {
    id: 'DEL-002',
    quoteId: 'RFQ-2024-003',
    clientName: 'Condomínio Verde',
    status: 'partial',
    expectedDate: '20/01/2024',
    lastUpdate: '18/01/2024',
    items: [
      {
        id: '1',
        description: 'Câmera de segurança',
        orderedQuantity: 4,
        deliveredQuantity: 2,
        serialNumber: 'CAM001-002'
      }
    ]
  },
  {
    id: 'DEL-003',
    quoteId: 'RFQ-2023-045',
    clientName: 'Administradora Central',
    status: 'completed',
    expectedDate: '10/01/2024',
    lastUpdate: '10/01/2024',
    items: [
      {
        id: '1',
        description: 'Material elétrico diverso',
        orderedQuantity: 1,
        deliveredQuantity: 1,
        serialNumber: 'ELE-LOT-123'
      }
    ]
  }
];

export function useSupplierReceiving() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento das entregas
    const loadDeliveries = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setDeliveries(mockDeliveries);
      setIsLoading(false);
    };

    loadDeliveries();
  }, []);

  const getDeliveryById = (id: string): Delivery | undefined => {
    return deliveries.find(delivery => delivery.id === id);
  };

  const registerDelivery = async (deliveryId: string, registrationData: DeliveryRegistration) => {
    // Simula registro da entrega
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setDeliveries(prev => prev.map(delivery => {
      if (delivery.id === deliveryId) {
        const updatedItems = delivery.items.map(item => ({
          ...item,
          deliveredQuantity: item.deliveredQuantity + registrationData.deliveredQuantity,
          serialNumber: registrationData.serialNumber || item.serialNumber
        }));
        
        const totalOrdered = delivery.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
        const totalDelivered = updatedItems.reduce((sum, item) => sum + item.deliveredQuantity, 0);
        
        let newStatus: Delivery['status'] = 'pending';
        if (totalDelivered >= totalOrdered) {
          newStatus = 'completed';
        } else if (totalDelivered > 0) {
          newStatus = 'partial';
        }

        return {
          ...delivery,
          items: updatedItems,
          status: newStatus,
          lastUpdate: new Date().toLocaleDateString('pt-BR')
        };
      }
      return delivery;
    }));

    // Mock audit log
    console.log('Audit Log:', {
      action: 'DELIVERY_REGISTERED',
      deliveryId,
      userId: 'supplier-1',
      timestamp: new Date().toISOString(),
      details: registrationData
    });
  };

  return {
    deliveries,
    isLoading,
    getDeliveryById,
    registerDelivery
  };
}