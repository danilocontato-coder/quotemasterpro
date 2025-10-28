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
    const { status, type, index, step, action } = data;

    console.log('[TOUR] 📍 Callback:', { status, type, index, action, target: step?.target });

    // Tratamento especial para target não encontrado
    if (type === EVENTS.TARGET_NOT_FOUND) {
      const target = step?.target;
      
      // Log de todos os data-tour disponíveis na página
      const availableElements = Array.from(document.querySelectorAll('[data-tour]'))
        .map(el => el.getAttribute('data-tour'));
      
      console.error('[TOUR] ❌ Target não encontrado:', {
        target,
        stepIndex: index,
        stepTitle: step?.title || step?.content,
        availableTargets: document.querySelectorAll('[data-tour]').length,
        availableElements
      });
      
      console.log('[TOUR] 📍 Elementos data-tour disponíveis:', availableElements);
      
      // Retry mechanism: tentar novamente após um delay
      if (!step?.data?.retryCount || step.data.retryCount < 3) {
        const retryCount = (step?.data?.retryCount || 0) + 1;
        console.log(`[TOUR] 🔄 Tentativa ${retryCount}/3 para encontrar target:`, step?.target);
        
        setTimeout(() => {
          // Forçar re-render do Joyride para tentar novamente
          setStepIndex(index);
        }, 500);
        
        // Atualizar contador de retry no step
        if (step) {
          step.data = { ...step.data, retryCount };
        }
        return;
      } else {
        console.error('[TOUR] ❌ Target não encontrado após 3 tentativas - pulando step:', step?.target);
        toast.error('Elemento não encontrado. Avançando para o próximo passo...');
        setStepIndex(index + 1);
        return;
      }
    }

    // Atualizar índice do step atual
    if (type === EVENTS.STEP_AFTER) {
      console.log('[TOUR] ➡️ Avançando para próximo step');
      setStepIndex(index + 1);
    }

    // Tour finalizado ou pulado
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('[TOUR] 🏁 Tour finalizado/pulado:', status);
      setRun(false);
      
      if (user?.id) {
        try {
          console.log('[TOUR] 💾 Chamando edge function complete-tour...');
          // Marcar tour como completo no banco
          const { error } = await supabase.functions.invoke('complete-tour', {
            body: { userId: user.id }
          });

          if (error) {
            console.error('[TOUR] ❌ Erro ao marcar tour como completo:', error);
          } else {
            console.log('[TOUR] ✅ Tour marcado como completo com sucesso');
            // Log de auditoria local
            if (status === STATUS.FINISHED) {
              toast.success('Tour concluído! Você já pode usar todas as funcionalidades.');
            }
          }
        } catch (error) {
          console.error('[TOUR] ❌ Exceção ao completar tour:', error);
        }
      }
    }
  };

  if (!user || user.forcePasswordChange) {
    return <>{children}</>;
  }

  // Aguardar aceitação de termos antes de iniciar tour
  if (!user.termsAccepted) {
    console.log('[TOUR] ⏸️ Aguardando aceitação de termos antes de iniciar tour');
    return <>{children}</>;
  }

  // Aguardar conclusão de onboarding antes de iniciar tour
  if (!user.onboardingCompleted) {
    console.log('[TOUR] ⏸️ Aguardando conclusão de onboarding antes de iniciar tour');
    return <>{children}</>;
  }

  // Tour já foi completado
  if (user.tourCompleted) {
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
