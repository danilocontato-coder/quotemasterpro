import { z } from 'zod';

/**
 * Schema de validação para senhas robustas
 * Requisitos:
 * - Mínimo 12 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 */
export const passwordSchema = z.string()
  .min(12, 'A senha deve ter pelo menos 12 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/, 'A senha deve conter pelo menos um caractere especial (!@#$%^&* etc.)');

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Valida uma senha e retorna feedback detalhado
 */
export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password),
  };

  const errors: string[] = [];
  
  if (!checks.minLength) {
    errors.push('Mínimo de 12 caracteres');
  }
  if (!checks.hasUppercase) {
    errors.push('Incluir letra maiúscula');
  }
  if (!checks.hasLowercase) {
    errors.push('Incluir letra minúscula');
  }
  if (!checks.hasNumber) {
    errors.push('Incluir um número');
  }
  if (!checks.hasSpecialChar) {
    errors.push('Incluir caractere especial (!@#$%^&*)');
  }

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  let strength: PasswordValidationResult['strength'] = 'weak';
  if (passedChecks >= 5) {
    strength = 'very-strong';
  } else if (passedChecks >= 4) {
    strength = 'strong';
  } else if (passedChecks >= 3) {
    strength = 'medium';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    checks,
  };
}

/**
 * Retorna a cor do indicador de força
 */
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'bg-green-500';
    case 'strong':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'weak':
    default:
      return 'bg-red-500';
  }
}

/**
 * Retorna o label da força
 */
export function getStrengthLabel(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'Muito forte';
    case 'strong':
      return 'Forte';
    case 'medium':
      return 'Média';
    case 'weak':
    default:
      return 'Fraca';
  }
}
