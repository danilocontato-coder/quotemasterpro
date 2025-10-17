import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_icon: string;
  achievement_description: string | null;
  earned_at: string;
  progress: number;
  progress_max: number | null;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('achievements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAchievements = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Todas as conquistas possíveis
      const allPossibleAchievements = [
        {
          achievement_type: 'primeira_avaliacao',
          achievement_name: 'Primeira Avaliação',
          achievement_icon: '🌟',
          achievement_description: 'Você fez sua primeira avaliação de fornecedor!',
          progress_max: 1
        },
        {
          achievement_type: 'avaliador_ativo_5',
          achievement_name: 'Avaliador Ativo',
          achievement_icon: '💬',
          achievement_description: 'Você já fez 5 avaliações! Continue assim!',
          progress_max: 5
        },
        {
          achievement_type: 'expert_feedback_20',
          achievement_name: 'Expert em Feedback',
          achievement_icon: '🏆',
          achievement_description: 'Incrível! Você já fez 20 avaliações e ajuda muito a comunidade!',
          progress_max: 20
        },
        {
          achievement_type: 'critico_detalhista_10',
          achievement_name: 'Crítico Detalhista',
          achievement_icon: '📝',
          achievement_description: 'Suas avaliações detalhadas ajudam muito outros clientes!',
          progress_max: 10
        }
      ];

      // Buscar conquistas do usuário
      const { data: earnedAchievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      // Combinar conquistas desbloqueadas e bloqueadas
      const earnedTypes = new Set(earnedAchievements?.map(a => a.achievement_type) || []);
      
      const allAchievements = allPossibleAchievements.map(possible => {
        const earned = earnedAchievements?.find(e => e.achievement_type === possible.achievement_type);
        
        if (earned) {
          return earned;
        } else {
          // Conquista ainda bloqueada
          return {
            id: `locked-${possible.achievement_type}`,
            ...possible,
            earned_at: null,
            progress: 0
          };
        }
      });

      setAchievements(allAchievements as Achievement[]);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { achievements, isLoading, refetch: fetchAchievements };
}
