import { useState, useEffect } from 'react';
import { Star, Clock, CheckCircle, AlertCircle, TrendingUp, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SupplierRatingModal from '@/components/ratings/SupplierRatingModal';
import { RatingPrompts } from '@/components/ratings/RatingPrompts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { formatQuoteCode } from '@/utils/formatQuoteCode';

interface PendingRating {
  id: string;
  supplier_id: string;
  supplier_name: string;
  quote_id: string;
  quote_local_code?: string;
  delivery_id: string;
  delivered_at: string;
  days_since_delivery: number;
}

interface CompletedRating {
  id: string;
  supplier_id: string;
  supplier_name: string;
  quote_id?: string;
  quote_local_code?: string;
  rating: number;
  quality_rating: number;
  delivery_rating: number;
  communication_rating: number;
  price_rating: number;
  would_recommend: boolean;
  comments: string;
  created_at: string;
  delivery_local_code?: string;
}

export default function ClientRatings() {
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [completedRatings, setCompletedRatings] = useState<CompletedRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<PendingRating | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    avgRating: 0,
    wouldRecommendRate: 0,
  });
  const { toast } = useToast();
  const { achievements, isLoading: achievementsLoading } = useAchievements();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user's client_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) return;

      // Fetch pending ratings (delivered but not rated)
      const { data: pending } = await supabase
        .from('deliveries')
        .select(`
          id,
          supplier_id,
          quote_id,
          actual_delivery_date,
          quotes!inner(supplier_name, local_code)
        `)
        .eq('client_id', profile.client_id)
        .eq('status', 'delivered')
        .not('actual_delivery_date', 'is', null)
        .order('actual_delivery_date', { ascending: false });

      if (pending) {
        // Filter out already rated deliveries and quotes
        const { data: existingRatings } = await supabase
          .from('supplier_ratings')
          .select('delivery_id, quote_id')
          .eq('client_id', profile.client_id);

        const ratedDeliveryIds = new Set(existingRatings?.map(r => r.delivery_id).filter(Boolean) || []);
        const ratedQuoteIds = new Set(existingRatings?.map(r => r.quote_id).filter(Boolean) || []);
        
      const pendingList: PendingRating[] = pending
        .filter(d => !ratedDeliveryIds.has(d.id) && !ratedQuoteIds.has(d.quote_id))
        .map(d => ({
          id: d.id,
          supplier_id: d.supplier_id,
          supplier_name: (d.quotes as any)?.supplier_name || 'Fornecedor',
          quote_id: d.quote_id,
          quote_local_code: (d.quotes as any)?.local_code,
          delivery_id: d.id,
          delivered_at: d.actual_delivery_date,
          days_since_delivery: Math.floor((Date.now() - new Date(d.actual_delivery_date).getTime()) / (1000 * 60 * 60 * 24))
        }));

        setPendingRatings(pendingList);
      }

      // Fetch completed ratings
      const { data: completed } = await supabase
        .from('supplier_ratings')
        .select(`
          id,
          supplier_id,
          quote_id,
          rating,
          quality_rating,
          delivery_rating,
          communication_rating,
          price_rating,
          would_recommend,
          comments,
          created_at,
          delivery_id,
          suppliers(name),
          deliveries(local_code),
          quotes(local_code)
        `)
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false });

      if (completed) {
      const completedList: CompletedRating[] = completed.map(r => ({
        id: r.id,
        supplier_id: r.supplier_id,
        supplier_name: (r.suppliers as any)?.name || 'Fornecedor',
        quote_id: r.quote_id,
        quote_local_code: (r.quotes as any)?.local_code,
        rating: r.rating,
        quality_rating: r.quality_rating,
        delivery_rating: r.delivery_rating,
        communication_rating: r.communication_rating,
        price_rating: r.price_rating,
        would_recommend: r.would_recommend,
        comments: r.comments || '',
        created_at: r.created_at,
        delivery_local_code: (r.deliveries as any)?.local_code
      }));

        setCompletedRatings(completedList);

        // Calculate stats
        if (completedList.length > 0) {
          const avgRating = completedList.reduce((sum, r) => sum + r.rating, 0) / completedList.length;
          const wouldRecommendCount = completedList.filter(r => r.would_recommend).length;
          
          setStats({
            total: completedList.length,
            avgRating: Math.round(avgRating * 10) / 10,
            wouldRecommendRate: Math.round((wouldRecommendCount / completedList.length) * 100)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as avaliações',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateClick = (pending: PendingRating) => {
    setSelectedRating(pending);
  };

  const handleRatingSubmitted = () => {
    setSelectedRating(null);
    fetchData();
    toast({
      title: 'Avaliação enviada!',
      description: 'Obrigado pelo seu feedback.'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Minhas Avaliações</h1>
        <p className="text-muted-foreground">
          Avalie fornecedores e ajude a melhorar a qualidade dos serviços
        </p>
      </div>

      {/* Rating Prompts at the top */}
      <RatingPrompts onRated={fetchData} />

      {/* Stats Cards */}
      {!isLoading && stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média das Suas Notas</CardTitle>
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
              <div className="flex items-center mt-1">
                {renderStars(Math.round(stats.avgRating))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Recomendação</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.wouldRecommendRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seção de Conquistas */}
      {!isLoading && !achievementsLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Suas Conquistas
            </CardTitle>
            <CardDescription>
              Desbloqueie badges avaliando fornecedores e ajude a comunidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    icon={achievement.achievement_icon}
                    name={achievement.achievement_name}
                    description={achievement.achievement_description}
                    progress={achievement.progress}
                    progressMax={achievement.progress_max}
                    earned={achievement.earned_at !== null}
                    earnedAt={achievement.earned_at}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Comece a avaliar fornecedores para desbloquear conquistas! 🎯
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingRatings.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {pendingRatings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Histórico
            {completedRatings.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({completedRatings.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Ratings Tab */}
        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : pendingRatings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação pendente</h3>
                <p className="text-muted-foreground text-center">
                  Você está em dia com suas avaliações!
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRatings.map(pending => (
              <Card key={pending.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{pending.supplier_name}</h3>
                        {pending.days_since_delivery > 3 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Clock className="h-4 w-4" />
                        Entregue há {pending.days_since_delivery} dia(s)
                      </div>
                          <p className="text-sm text-muted-foreground">
                            Cotação: {formatQuoteCode({ id: pending.quote_id, local_code: pending.quote_local_code })}
                          </p>
                    </div>
                    <Button onClick={() => handleRateClick(pending)}>
                      <Star className="h-4 w-4 mr-2" />
                      Avaliar Agora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed Ratings Tab */}
        <TabsContent value="completed" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : completedRatings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h3>
                <p className="text-muted-foreground text-center">
                  Suas avaliações aparecerão aqui após serem enviadas
                </p>
              </CardContent>
            </Card>
          ) : (
            completedRatings.map(rating => (
              <Card key={rating.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{rating.supplier_name}</CardTitle>
                      <CardDescription>
                        {format(new Date(rating.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {rating.quote_local_code && ` • Cotação ${formatQuoteCode({ id: rating.quote_id || '', local_code: rating.quote_local_code })}`}
                        {rating.delivery_local_code && ` • Entrega ${rating.delivery_local_code}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">{rating.rating.toFixed(1)}</div>
                      {renderStars(rating.rating)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Qualidade</p>
                      {renderStars(rating.quality_rating)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pontualidade</p>
                      {renderStars(rating.delivery_rating)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Comunicação</p>
                      {renderStars(rating.communication_rating)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Preço</p>
                      {renderStars(rating.price_rating)}
                    </div>
                  </div>
                  
                  {rating.comments && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Comentários:</p>
                      <p className="text-sm text-muted-foreground">{rating.comments}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {rating.would_recommend ? (
                      <Badge variant="default" className="bg-green-500">
                        ✓ Recomendaria
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Não recomendaria
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Rating Modal */}
      {selectedRating && (
        <SupplierRatingModal
          open={!!selectedRating}
          onClose={() => setSelectedRating(null)}
          supplierId={selectedRating.supplier_id}
          supplierName={selectedRating.supplier_name}
          quoteId={selectedRating.quote_id}
          deliveryId={selectedRating.delivery_id}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
}
