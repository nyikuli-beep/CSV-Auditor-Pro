export interface PasswordRequirements {
  minChars: boolean;
  maxChars: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export type StrengthLevel = 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';

export interface PasswordStrengthResult {
  requirements: PasswordRequirements;
  isAllSatisfied: boolean;
  score: number; // 0 to 100
  level: StrengthLevel;
  colorClass: string;
}

export function evaluatePassword(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirements = {
    minChars: password.length >= 8,
    maxChars: password.length <= 128,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
  };

  const isAllSatisfied =
    requirements.minChars &&
    requirements.maxChars &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumber &&
    requirements.hasSpecialChar;

  // Calculate score out of 100
  let passedCount = 0;
  if (requirements.minChars) passedCount++;
  if (requirements.maxChars && password.length > 0) passedCount++;
  if (requirements.hasUppercase) passedCount++;
  if (requirements.hasLowercase) passedCount++;
  if (requirements.hasNumber) passedCount++;
  if (requirements.hasSpecialChar) passedCount++;

  // Extra length bonus
  let bonus = 0;
  if (password.length >= 12) bonus = 10;
  if (password.length >= 16) bonus = 20;

  let score = Math.min(100, Math.round((passedCount / 6) * 80 + bonus));
  if (password.length === 0) score = 0;

  let level: StrengthLevel = 'Very Weak';
  let colorClass = 'bg-rose-500';

  if (score === 0) {
    level = 'Very Weak';
    colorClass = 'bg-slate-500';
  } else if (score < 40) {
    level = 'Weak';
    colorClass = 'bg-rose-500';
  } else if (score < 65) {
    level = 'Fair';
    colorClass = 'bg-amber-500';
  } else if (score < 85) {
    level = 'Strong';
    colorClass = 'bg-blue-500';
  } else {
    level = 'Excellent';
    colorClass = 'bg-emerald-500';
  }

  return {
    requirements,
    isAllSatisfied,
    score,
    level,
    colorClass,
  };
}
