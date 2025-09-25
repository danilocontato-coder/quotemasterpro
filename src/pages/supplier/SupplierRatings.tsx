import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, MessageSquare, ThumbsUp, Award } from 'lucide-react';
import { useSupplierRatings } from '@/hooks/useSupplierRatings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SupplierRatingData {
  id: string;
  client_name?: string;
  rating: number;
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  price_rating?: number;
  would_recommend?: boolean;
  comments?: string;
  created_at: string;
  quote_id?: string;
}

export default function SupplierRatings() {
  const [supplierRatings, setSupplierRatings] = useState<SupplierRatingData[]>([]);
  const [averageRatings, setAverageRatings] = useState({
    overall: 0,
    quality: 0,
    delivery: 0,
    communication: 0,
    price: 0,
    recommendation_rate: 0,
    total_ratings: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.supplierId) {
      fetchSupplierRatings();
      fetchAverageRatings();
    }
  }, [user?.supplierId]);

  const fetchSupplierRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_ratings')
        .select('*')
        .eq('supplier_id', user?.supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRatings = data?.map(rating => ({
        ...rating,
        client_name: 'Cliente'
      })) || [];

      setSupplierRatings(formattedRatings);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAverageRatings = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_supplier_average_rating', { supplier_uuid: user?.supplierId });

      if (error) throw error;

      if (data && data.length > 0) {
        setAverageRatings({
          overall: data[0].avg_rating || 0,
          quality: data[0].avg_quality || 0,
          delivery: data[0].avg_delivery || 0,
          communication: data[0].avg_communication || 0,
          price: data[0].avg_price || 0,
          recommendation_rate: data[0].recommendation_rate || 0,
          total_ratings: data[0].total_ratings || 0
        });
      }
    } catch (error) {
      console.error('Erro ao buscar médias:', error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suas Avaliações</h1>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {averageRatings.total_ratings} avaliações
        </Badge>
      </div>

      {/* Métricas de Avaliação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avaliação Geral</p>
                <p className={`text-2xl font-bold ${getRatingColor(averageRatings.overall)}`}>
                  {averageRatings.overall.toFixed(1)}
                </p>
              </div>
              <div className="flex">
                {renderStars(Math.round(averageRatings.overall))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qualidade</p>
                <p className={`text-2xl font-bold ${getRatingColor(averageRatings.quality)}`}>
                  {averageRatings.quality.toFixed(1)}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrega</p>
                <p className={`text-2xl font-bold ${getRatingColor(averageRatings.delivery)}`}>
                  {averageRatings.delivery.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recomendação</p>
                <p className="text-2xl font-bold text-green-600">
                  {averageRatings.recommendation_rate.toFixed(0)}%
                </p>
              </div>
              <ThumbsUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações Recebidas</CardTitle>
        </CardHeader>
        <CardContent>
          {supplierRatings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma avaliação ainda
              </h3>
              <p className="text-gray-500">
                Suas avaliações aparecerão aqui após a conclusão dos serviços.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierRatings.map((rating) => (
                <div key={rating.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{rating.client_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {renderStars(Math.round(rating.rating))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {rating.rating.toFixed(1)} estrelas
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(rating.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {rating.quote_id && (
                        <p className="text-xs text-muted-foreground">
                          Cotação: {rating.quote_id}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detalhes das avaliações */}
                  {(rating.quality_rating || rating.delivery_rating || rating.communication_rating || rating.price_rating) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                      {rating.quality_rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Qualidade:</span>
                          <span className="font-medium">{rating.quality_rating.toFixed(1)}</span>
                        </div>
                      )}
                      {rating.delivery_rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Entrega:</span>
                          <span className="font-medium">{rating.delivery_rating.toFixed(1)}</span>
                        </div>
                      )}
                      {rating.communication_rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Comunicação:</span>
                          <span className="font-medium">{rating.communication_rating.toFixed(1)}</span>
                        </div>
                      )}
                      {rating.price_rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Preço:</span>
                          <span className="font-medium">{rating.price_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {rating.comments && (
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{rating.comments}</p>
                      </div>
                    </div>
                  )}

                  {rating.would_recommend !== null && (
                    <div className="flex items-center gap-2">
                      <ThumbsUp className={`h-4 w-4 ${rating.would_recommend ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm text-muted-foreground">
                        {rating.would_recommend ? 'Recomendaria' : 'Não recomendaria'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}