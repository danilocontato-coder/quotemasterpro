import React from 'react';
import { NavLink as RouterNavLink, NavLinkProps } from 'react-router-dom';

interface TransitionNavLinkProps extends Omit<NavLinkProps, 'onClick'> {
  to: string;
  children: React.ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  onClick?: () => void;
}

/**
 * Optimized NavLink component for smooth mobile navigation
 * Uses native NavLink for better performance on mobile devices
 */
export const TransitionNavLink: React.FC<TransitionNavLinkProps> = ({ 
  to, 
  children, 
  className,
  onClick,
  ...props 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided (for closing mobile menu)
    if (onClick) {
      onClick();
    }
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