export type StrengthLevel = 'weak' | 'medium' | 'strong';

export interface PasswordStrength {
  level: StrengthLevel;
  /** 0-4 score used to drive the meter width. */
  score: number;
  label: string;
}

/**
 * Heuristic password strength based on length and character variety.
 * Empty input returns score 0 / weak so the meter stays collapsed.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: 'weak', score: 0, label: '' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { level: 'weak', score: Math.max(1, score), label: 'Weak' };
  if (score === 3) return { level: 'medium', score, label: 'Medium' };
  return { level: 'strong', score: 4, label: 'Strong' };
}
