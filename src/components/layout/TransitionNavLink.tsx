import React, { startTransition } from 'react';
import { NavLink as RouterNavLink, useNavigate, NavLinkProps } from 'react-router-dom';

interface TransitionNavLinkProps extends Omit<NavLinkProps, 'onClick'> {
  to: string;
  children: React.ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  onClick?: () => void;
}

/**
 * Enhanced NavLink that wraps navigation with startTransition
 * to prevent suspension errors during lazy component loading
 */
export const TransitionNavLink: React.FC<TransitionNavLinkProps> = ({ 
  to, 
  children, 
  className,
  onClick,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Call custom onClick if provided
    if (onClick) {
      onClick();
    }
    
    // Use startTransition to make navigation non-urgent
    startTransition(() => {
      navigate(to);
    });
  };

  return (
    <RouterNavLink
      to={to}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </RouterNavLink>
  );
};