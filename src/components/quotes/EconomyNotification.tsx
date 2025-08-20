import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingDown, Eye, CheckCircle } from 'lucide-react';

export interface EconomyAlert {
  id: string;
  quoteId: string;
  quoteTitle: string;
  type: 'multi_supplier' | 'price_drop' | 'better_terms';
  savings: number;
  savingsPercentage: number;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface EconomyNotificationProps {
  alerts: EconomyAlert[];
  onViewDetails: (quoteId: string) => void;
  onDismiss: (alertId: string) => void;
  onMarkAsRead: (alertId: string) => void;
}

export function EconomyNotification({ 
  alerts, 
  onViewDetails, 
  onDismiss, 
  onMarkAsRead 
}: EconomyNotificationProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<EconomyAlert[]>([]);

  useEffect(() => {
    // Show only unread alerts, sorted by savings amount
    const unreadAlerts = alerts
      .filter(alert => !alert.isRead)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 2); // Show max 2 notifications
    
    setVisibleAlerts(unreadAlerts);
  }, [alerts]);

  if (visibleAlerts.length === 0) return null;

  const getAlertColor = (type: EconomyAlert['type']) => {
    switch (type) {
      case 'multi_supplier':
        return 'border-blue-200 bg-blue-50';
      case 'price_drop':
        return 'border-green-200 bg-green-50';
      case 'better_terms':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getAlertIcon = (type: EconomyAlert['type']) => {
    switch (type) {
      case 'multi_supplier':
        return '🎯';
      case 'price_drop':
        return '📉';
      case 'better_terms':
        return '⭐';
      default:
        return '💡';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleAlerts.map((alert) => (
        <Card 
          key={alert.id} 
          className={`${getAlertColor(alert.type)} border-l-4 shadow-lg animate-in slide-in-from-right duration-300`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <Badge variant="secondary" className="text-xs">
                    Economia Detectada
                  </Badge>
                </div>
                
                <h4 className="font-semibold text-sm mb-1">
                  {alert.quoteTitle}
                </h4>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {alert.message}
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1 text-green-700">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-bold">
                      {formatCurrency(alert.savings)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.savingsPercentage.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      onViewDetails(alert.quoteId);
                      onMarkAsRead(alert.id);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Detalhes
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => onMarkAsRead(alert.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Marcar Lida
                  </Button>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              {new Date(alert.timestamp).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Hook for managing economy alerts
export function useEconomyAlerts() {
  const [alerts, setAlerts] = useState<EconomyAlert[]>([]);

  const addAlert = (alert: Omit<EconomyAlert, 'id' | 'timestamp' | 'isRead'>) => {
    const newAlert: EconomyAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    setAlerts(prev => [newAlert, ...prev]);
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAll = () => {
    setAlerts([]);
  };

  return {
    alerts,
    addAlert,
    markAsRead,
    dismissAlert,
    clearAll,
  };
}