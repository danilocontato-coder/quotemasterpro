import React from 'react';

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  animation?: 'fade' | 'scale';
}

/**
 * Wrapper para páginas com animação de entrada suave
 */
export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Seção animada individual dentro da página
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({ 
  children, 
  delay = 0, 
  className = '',
  animation = 'fade'
}) => {
  const animationClass = animation === 'scale' ? 'animate-scale-in' : 'animate-fade-in';
  
  return (
    <div 
      className={`${animationClass} ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
        opacity: 0,
        animationFillMode: 'forwards'
      }}
    >
      {children}
    </div>
  );
};

/**
 * Grid animado com delay escalonado para os itens
 */
interface AnimatedGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6;
  baseDelay?: number;
  itemDelay?: number;
  className?: string;
}

export const AnimatedGrid: React.FC<AnimatedGridProps> = ({
  children,
  columns = 3,
  baseDelay = 0.5,
  itemDelay = 0.05,
  className = ''
}) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-6'
  }[columns];

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {childrenArray.map((child, index) => {
        const animationDelay = baseDelay + (index * itemDelay);
        
        return (
          <div
            key={index}
            className="animate-scale-in"
            style={{
              animationDelay: `${animationDelay}s`,
              opacity: 0,
              animationFillMode: 'forwards'
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Header animado com título e ações
 */
interface AnimatedHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in ${className}`}>
      <div className="space-y-2">
        <h1 
          className="text-3xl font-bold tracking-tight animate-fade-in" 
          style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p 
            className="text-muted-foreground animate-fade-in" 
            style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div 
          className="flex gap-2 animate-fade-in" 
          style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
