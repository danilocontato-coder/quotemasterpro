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
    // Só inicia o tour se:
    // 1. Usuário autenticado
    // 2. tour_completed = false
    // 3. onboarding_completed = true (já passou pelo cadastro)
    // 4. force_password_change = false (não está em troca obrigatória de senha)
    if (user && !user.tourCompleted && user.onboardingCompleted && !user.forcePasswordChange) {
      // Pequeno delay para garantir que a página carregou
      const timer = setTimeout(() => {
        setRun(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Listener para iniciar o tour após a troca de senha obrigatória
  useEffect(() => {
    const handlePasswordChanged = () => {
      if (user && !user.tourCompleted && user.onboardingCompleted) {
        setTimeout(() => {
          setRun(true);
        }, 1500);
      }
    };
    
    window.addEventListener('password-changed', handlePasswordChanged);
    return () => window.removeEventListener('password-changed', handlePasswordChanged);
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
