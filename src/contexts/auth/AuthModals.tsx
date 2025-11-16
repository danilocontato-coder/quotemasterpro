import React, { useState, useCallback } from 'react';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';
import { TermsOfUseModal } from '@/components/auth/TermsOfUseModal';
import { User } from './AuthCore';

export const useAuthModals = (user: User | null, setUser: (user: User | null) => void) => {
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

  const handlePasswordChanged = useCallback(() => {
    setForcePasswordChange(false);
  }, []);

  const handleTermsAccepted = useCallback(() => {
    setNeedsTermsAcceptance(false);
    setUser(user ? { ...user, termsAccepted: true } : null);
  }, [user, setUser]);

  const AuthModalsRenderer = () => (
    <>
      {user && (
        <>
          <ForcePasswordChangeModal 
            open={forcePasswordChange} 
            userEmail={user.email}
            onPasswordChanged={handlePasswordChanged}
          />
          <TermsOfUseModal
            open={needsTermsAcceptance}
            userId={user.id}
            onTermsAccepted={handleTermsAccepted}
          />
        </>
      )}
    </>
  );

  return {
    forcePasswordChange,
    setForcePasswordChange,
    needsTermsAcceptance,
    setNeedsTermsAcceptance,
    handlePasswordChanged,
    handleTermsAccepted,
    AuthModalsRenderer,
  };
};
