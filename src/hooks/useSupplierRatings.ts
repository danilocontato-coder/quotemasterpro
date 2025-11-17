import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierRating {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  quote_id?: string;
  payment_id?: string;
  delivery_id?: string;
  client_id: string;
  user_id: string;
  rating: number; // 1-5 stars
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  price_rating?: number;
  would_recommend?: boolean;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface RatingPrompt {
  id: string;
  type: 'rating_prompt';
  supplier_id: string;
  supplier_name: string;
  quote_id?: string;
  quote_local_code?: string;
  payment_id?: string;
  created_at: string;
  dismissed?: boolean;
}

export const useSupplierRatings = () => {
  const [ratings, setRatings] = useState<SupplierRating[]>([]);
  const [ratingPrompts, setRatingPrompts] = useState<RatingPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Buscar avaliações do Supabase
  useEffect(() => {
    if (user?.clientId) {
      fetchRatings();
      fetchRatingPrompts();
    }
  }, [user?.clientId]);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_ratings')
        .select('*')
        .eq('client_id', user?.clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRatings(data || []);

      
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRatingPrompts = async () => {
    try {
      // 1. Buscar notificações de rating_prompt não lidas
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'rating_prompt')
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      // 2. Buscar avaliações já existentes
      const { data: existingRatings, error: ratingsError } = await supabase
        .from('supplier_ratings')
        .select('supplier_id, quote_id, payment_id')
        .eq('client_id', user?.clientId);

      if (ratingsError) throw ratingsError;

      // 3. Criar Set de combinações já avaliadas
      const ratedCombinations = new Set(
        existingRatings?.map(r => 
          `${r.supplier_id}-${r.quote_id || ''}-${r.payment_id || ''}`
        ) || []
      );

      // 4. Filtrar notificações já avaliadas
      const filteredPrompts: RatingPrompt[] = notifications
        ?.map(notification => {
          const metadata = typeof notification.metadata === 'object' && notification.metadata !== null 
            ? notification.metadata as any 
            : {};
          
          return {
            id: notification.id,
            type: 'rating_prompt' as const,
            supplier_id: metadata.supplier_id || '',
            supplier_name: metadata.supplier_name || 'Fornecedor',
            quote_id: metadata.quote_id,
            quote_local_code: metadata.quote_local_code,
            payment_id: metadata.payment_id,
            created_at: notification.created_at,
            dismissed: false
          };
        })
        .filter(prompt => {
          const combination = `${prompt.supplier_id}-${prompt.quote_id || ''}-${prompt.payment_id || ''}`;
          return !ratedCombinations.has(combination);
        }) || [];

      setRatingPrompts(filteredPrompts);
      
      // 5. Marcar automaticamente como lidas as notificações já avaliadas
      const alreadyRatedNotificationIds = notifications
        ?.filter(n => {
          const metadata = n.metadata as any;
          const combination = `${metadata.supplier_id || ''}-${metadata.quote_id || ''}-${metadata.payment_id || ''}`;
          return ratedCombinations.has(combination);
        })
        .map(n => n.id) || [];

      if (alreadyRatedNotificationIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', alreadyRatedNotificationIds);
      }
      
    } catch (error) {
      console.error('Erro ao buscar prompts de avaliação:', error);
    }
  };

  const createRating = useCallback(async (ratingData: {
    supplier_id: string;
    quote_id?: string;
    payment_id?: string;
    rating: number;
    quality_rating?: number;
    delivery_rating?: number;
    communication_rating?: number;
    price_rating?: number;
    would_recommend?: boolean;
    comments?: string;
  }) => {
    try {
      const insertData = {
        supplier_id: ratingData.supplier_id,
        client_id: user?.clientId!,
        rater_id: user?.id!,
        rating: ratingData.rating,
        ...(ratingData.quote_id && { quote_id: ratingData.quote_id }),
        ...(ratingData.payment_id && { payment_id: ratingData.payment_id }),
        ...(ratingData.quality_rating && { quality_rating: ratingData.quality_rating }),
        ...(ratingData.delivery_rating && { delivery_rating: ratingData.delivery_rating }),
        ...(ratingData.communication_rating && { communication_rating: ratingData.communication_rating }),
        ...(ratingData.price_rating && { price_rating: ratingData.price_rating }),
        ...(ratingData.would_recommend !== undefined && { would_recommend: ratingData.would_recommend }),
        ...(ratingData.comments && { comments: ratingData.comments })
      };

      const { data, error } = await supabase
        .from('supplier_ratings')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Refresh ratings
      await fetchRatings();

      // Remove corresponding prompt
      if (ratingData.quote_id || ratingData.payment_id) {
        const promptToRemove = ratingPrompts.find(p => 
          p.quote_id === ratingData.quote_id || p.payment_id === ratingData.payment_id
        );
        
        if (promptToRemove) {
          await dismissPrompt(promptToRemove.id);
        }
      }

      toast({
        title: "Avaliação enviada",
        description: "Sua avaliação foi registrada com sucesso.",
      });

      return data.id;
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a avaliação.",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, toast, ratingPrompts, fetchRatings]);

  const dismissPrompt = useCallback(async (notificationId: string) => {
    try {
      // Marcar notificação como lida
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Remove from local state
      setRatingPrompts(prev => prev.filter(p => p.id !== notificationId));

      toast({
        title: "Lembrete dispensado",
        description: "O lembrete de avaliação foi dispensado.",
      });
    } catch (error) {
      console.error('Erro ao dispensar prompt:', error);
    }
  }, [toast]);

  const getSupplierAverageRating = useCallback(async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_supplier_average_rating', { supplier_uuid: supplierId });

      if (error) throw error;
      return data?.[0]?.avg_rating || 0;
    } catch (error) {
      console.error('Erro ao buscar rating médio:', error);
      return 0;
    }
  }, []);

  const getSupplierRatings = useCallback((supplierId: string) => {
    return ratings.filter(r => r.supplier_id === supplierId);
  }, [ratings]);

  const getActivePrompts = useCallback(() => {
    return ratingPrompts.filter(p => !p.dismissed);
  }, [ratingPrompts]);

  // Subscription para novos prompts em tempo real
  useEffect(() => {
    if (user?.id) {
      const channel = supabase
        .channel('rating-prompts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new.type === 'rating_prompt') {
              fetchRatingPrompts();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchRatingPrompts]);

  return {
    ratings,
    ratingPrompts: getActivePrompts(),
    isLoading,
    createRating,
    dismissPrompt,
    getSupplierAverageRating,
    getSupplierRatings,
    refreshRatings: fetchRatings,
    refreshPrompts: fetchRatingPrompts,
  };
};