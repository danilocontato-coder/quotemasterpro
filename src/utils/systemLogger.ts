/**
 * Sistema de Log Centralizado
 * Gerencia todos os logs do sistema de forma organizada
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'navigation' | 'auth' | 'data' | 'tenant';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

interface TenantContext {
  userId?: string;
  clientId?: string;
  supplierId?: string;
  role?: string;
  isAdminSimulated?: boolean;
  [key: string]: any;
}

class SystemLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabledCategories: Set<string> = new Set();
  private isDev = import.meta.env.DEV;

  constructor() {
    // Em dev, habilitar todas as categorias por padrão
    if (this.isDev) {
      this.enabledCategories.add('all');
    }
    
    // Expor no window para debug
    if (typeof window !== 'undefined') {
      (window as any).__SYSTEM_LOGGER__ = this;
    }
  }

  private shouldLog(category: string): boolean {
    if (!this.isDev) return false;
    return this.enabledCategories.has('all') || this.enabledCategories.has(category);
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.shouldLog(category)) {
      const icon = this.getIcon(level);
      const color = this.getColor(level);
      const prefix = `${icon} [${category.toUpperCase()}]`;
      
      if (data) {
        console.log(`%c${prefix} ${message}`, `color: ${color}; font-weight: bold`, data);
      } else {
        console.log(`%c${prefix} ${message}`, `color: ${color}; font-weight: bold`);
      }
    }
  }

  private getIcon(level: LogLevel): string {
    const icons = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      navigation: '🧭',
      auth: '🔐',
      data: '💾',
      tenant: '🏢'
    };
    return icons[level] || 'ℹ️';
  }

  private getColor(level: LogLevel): string {
    const colors = {
      info: '#3b82f6',
      warn: '#f59e0b',
      error: '#ef4444',
      debug: '#8b5cf6',
      navigation: '#10b981',
      auth: '#ec4899',
      data: '#06b6d4',
      tenant: '#f97316'
    };
    return colors[level] || '#3b82f6';
  }

  // Métodos públicos
  navigation(message: string, data?: any) {
    this.addLog('navigation', 'navigation', message, data);
  }

  auth(message: string, data?: any) {
    this.addLog('auth', 'auth', message, data);
  }

  data(message: string, data?: any) {
    this.addLog('data', 'data', message, data);
  }

  info(category: string, message: string, data?: any) {
    this.addLog('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.addLog('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.addLog('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.addLog('debug', category, message, data);
  }

  // Método especializado para logs multi-tenant
  tenant(message: string, context?: TenantContext) {
    const enrichedData = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE
    };
    
    this.addLog('tenant', 'tenant', message, enrichedData);
  }

  // Controle de categorias
  enable(category: string) {
    this.enabledCategories.add(category);
  }

  disable(category: string) {
    this.enabledCategories.delete(category);
  }

  enableAll() {
    this.enabledCategories.add('all');
  }

  disableAll() {
    this.enabledCategories.clear();
  }

  // Exportar logs
  getLogs(category?: string): LogEntry[] {
    if (!category) return this.logs;
    return this.logs.filter(log => log.category === category);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }

  // Detectar problemas
  detectIssues(): { refreshes: number; errors: number; slowOperations: number } {
    const refreshes = this.logs.filter(log => 
      log.message.toLowerCase().includes('reload') || 
      log.message.toLowerCase().includes('refresh')
    ).length;

    const errors = this.logs.filter(log => log.level === 'error').length;

    const slowOperations = this.logs.filter(log => 
      log.data?.duration && log.data.duration > 1000
    ).length;

    return { refreshes, errors, slowOperations };
  }
}

// Instância global
export const logger = new SystemLogger();

// Helper para medir performance
export function measure(operation: string, category: string = 'performance') {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    logger.info(category, `${operation} completou em ${duration.toFixed(2)}ms`, { duration });
    
    if (duration > 1000) {
      logger.warn(category, `Operação lenta detectada: ${operation}`, { duration });
    }
  };
}
