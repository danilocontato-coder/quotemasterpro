import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { getStepsForRole } from './TourSteps';
import { TourTooltip } from './TourTooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const willStartTour = !!(user && user.termsAccepted && !user.tourCompleted && user.onboardingCompleted && !user.forcePasswordChange);
    
    console.log('[TOUR] 🎯 Verificando condições para iniciar tour', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      termsAccepted: user?.termsAccepted,
      tourCompleted: user?.tourCompleted,
      onboardingCompleted: user?.onboardingCompleted,
      forcePasswordChange: user?.forcePasswordChange,
      willStartTour,
      timestamp: new Date().toISOString()
    });

    // Só inicia o tour se:
    // 1. Usuário autenticado
    // 2. tour_completed = false
    // 3. onboarding_completed = true (já passou pelo cadastro)
    // 4. force_password_change = false (não está em troca obrigatória de senha)
    // 5. terms_accepted = true (já aceitou os termos)
    if (willStartTour) {
      console.log('[TOUR] ✅ Todas as condições atendidas - iniciando tour em 1.5s');
      // Pequeno delay para garantir que a página carregou
      const timer = setTimeout(() => {
        console.log('[TOUR] 🚀 Disparando tour agora!');
        setRun(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      console.log('[TOUR] ❌ Condições não atendidas - tour não será iniciado', {
        reason: !user ? 'Sem usuário' :
                !user.termsAccepted ? 'Termos não aceitos' :
                user.tourCompleted ? 'Tour já completo' :
                !user.onboardingCompleted ? 'Onboarding não completo' :
                user.forcePasswordChange ? 'Senha precisa ser trocada' : 'Indefinido'
      });
    }
  }, [user]);

  // Listener para iniciar o tour após a troca de senha obrigatória ou aceitação de termos
  useEffect(() => {
    const handlePasswordChanged = () => {
      console.log('[TOUR] 🔑 Evento password-changed recebido', {
        hasUser: !!user,
        termsAccepted: user?.termsAccepted,
        tourCompleted: user?.tourCompleted,
        onboardingCompleted: user?.onboardingCompleted
      });
      
      if (user && user.termsAccepted && !user.tourCompleted && user.onboardingCompleted) {
        console.log('[TOUR] ✅ Após troca de senha - iniciando tour em 1.5s');
        setTimeout(() => {
          console.log('[TOUR] 🚀 Disparando tour pós-senha');
          setRun(true);
        }, 1500);
      }
    };

    const handleTermsAccepted = () => {
      console.log('[TOUR] 📄 Evento terms-accepted recebido', {
        hasUser: !!user,
        tourCompleted: user?.tourCompleted,
        onboardingCompleted: user?.onboardingCompleted,
        forcePasswordChange: user?.forcePasswordChange
      });
      
      if (user && !user.tourCompleted && user.onboardingCompleted && !user.forcePasswordChange) {
        console.log('[TOUR] ✅ Após aceitar termos - iniciando tour em 1.5s');
        setTimeout(() => {
          console.log('[TOUR] 🚀 Disparando tour pós-termos');
          setRun(true);
        }, 1500);
      }
    };
    
    window.addEventListener('password-changed', handlePasswordChanged);
    window.addEventListener('terms-accepted', handleTermsAccepted);
    
    console.log('[TOUR] 👂 Event listeners registrados para password-changed e terms-accepted');
    
    return () => {
      window.removeEventListener('password-changed', handlePasswordChanged);
      window.removeEventListener('terms-accepted', handleTermsAccepted);
      console.log('[TOUR] 🔇 Event listeners removidos');
    };
  }, [user]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type, index } = data;

    // Atualizar índice do step atual
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (type === EVENTS.STEP_AFTER ? 1 : 0));
    }

    // Tour finalizado ou pulado
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      
      if (user?.id) {
        try {
          // Marcar tour como completo no banco
          const { error } = await supabase.functions.invoke('complete-tour', {
            body: { userId: user.id }
          });

          if (error) {
            console.error('Erro ao marcar tour como completo:', error);
          } else {
            // Log de auditoria local
            if (status === STATUS.FINISHED) {
              toast.success('Tour concluído! Você já pode usar todas as funcionalidades.');
            }
          }
        } catch (error) {
          console.error('Erro ao completar tour:', error);
        }
      }
    }
  };

  if (!user || user.tourCompleted || !user.onboardingCompleted) {
    return <>{children}</>;
  }

  const steps = getStepsForRole(user.role, user.tenantType);

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        tooltipComponent={TourTooltip}
        spotlightClicks
        disableOverlayClose
        styles={{
          options: {
            zIndex: 10000,
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          spotlight: {
            borderRadius: '8px',
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Fechar',
          last: 'Concluir',
          next: 'Próximo',
          skip: 'Pular Tour',
        }}
      />
      {children}
    </>
  );
};
