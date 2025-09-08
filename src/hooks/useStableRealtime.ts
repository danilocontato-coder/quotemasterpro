import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useStableRealtime() {
  const { user } = useAuth();
  const activeRef = useRef(false);
  
  useEffect(() => {
    if (!user?.id || activeRef.current) return;
    
    activeRef.current = true;
    
    return () => {
      activeRef.current = false;
    };
  }, [user?.id]);
  
  return null;
}