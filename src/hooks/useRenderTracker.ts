import { useEffect, useRef } from 'react';

export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    console.log(`🔄 ${componentName} render #${renderCount.current}`, {
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      timestamp: new Date().toISOString(),
      isVisible: !document.hidden
    });
    
    lastRenderTime.current = now;
  });
  
  return renderCount.current;
}