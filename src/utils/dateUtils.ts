import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converte data UTC do Supabase para horário local do Brasil (BRT/BRST)
 */
export function parseUTCDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // Parse ISO string e converter para horário local
    const date = parseISO(dateString);
    return date;
  } catch (error) {
    console.error('Erro ao fazer parse da data:', error);
    return null;
  }
}

/**
 * Formata data para exibição em pt-BR com horário local
 * Exemplo: "10/10/2025 14:09"
 */
export function formatLocalDateTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

/**
 * Formata apenas data (sem hora)
 * Exemplo: "10/10/2025"
 */
export function formatLocalDate(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Formata apenas hora
 * Exemplo: "14:09"
 */
export function formatLocalTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  
  return format(date, "HH:mm", { locale: ptBR });
}

/**
 * Formata distância relativa (ex: "há 2 horas")
 * Usa horário local automaticamente
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR
  });
}

/**
 * Formata data completa por extenso
 * Exemplo: "10 de outubro de 2025 às 14:09"
 */
export function formatFullDateTime(dateString: string | null | undefined): string {
  const date = parseUTCDate(dateString);
  if (!date) return '-';
  
  return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata data com destaque no horário
 * Exemplo: { date: "22 de outubro de 2025", time: "09:00" }
 */
export function formatDateWithTime(dateString: string | null | undefined): { date: string; time: string } {
  const parsedDate = parseUTCDate(dateString);
  if (!parsedDate) return { date: '-', time: '-' };
  
  return {
    date: format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    time: format(parsedDate, "HH:mm", { locale: ptBR })
  };
}

/**
 * Converte data local para UTC string (para salvar no Supabase)
 */
export function toUTCString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}
