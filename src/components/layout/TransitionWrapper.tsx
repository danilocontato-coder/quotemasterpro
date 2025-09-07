import React, { startTransition } from 'react';
import { useNavigate } from 'react-router-dom';

interface TransitionWrapperProps {
  children: React.ReactElement;
  to: string;
}

/**
 * Wrapper component that handles navigation with startTransition
 * to prevent suspension errors with lazy-loaded components
 */
export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ children, to }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Use startTransition to make navigation non-urgent
    startTransition(() => {
      navigate(to);
    });
  };

  // Clone the child element and add onClick handler
  return React.cloneElement(children, {
    onClick: handleClick,
    href: to,
  });
};