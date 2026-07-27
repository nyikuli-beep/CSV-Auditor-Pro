/**
 * Password Security Rules & Strength Calculator for CSV Auditor Pro
 */

export interface PasswordRuleCheck {
  id: string;
  label: string;
  satisfied: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 100
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';
  color: string; // Tailwind color class for progress bar
  textColor: string;
  bgLightColor: string;
  rules: {
    minLength: boolean;
    maxLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  isValid: boolean;
  checklist: PasswordRuleCheck[];
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const minLength = password.length >= 8;
  const maxLength = password.length <= 128 && password.length > 0;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  // Special characters: symbols including !@#$%^&*()_+-=[]{};':"\|,.<>/?~`
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const checklist: PasswordRuleCheck[] = [
    { id: 'minLength', label: 'At least 8 characters', satisfied: minLength },
    { id: 'hasUppercase', label: 'At least 1 uppercase letter (A-Z)', satisfied: hasUppercase },
    { id: 'hasLowercase', label: 'At least 1 lowercase letter (a-z)', satisfied: hasLowercase },
    { id: 'hasNumber', label: 'At least 1 number (0-9)', satisfied: hasNumber },
    { id: 'hasSpecialChar', label: 'At least 1 special character (!@#$...)', satisfied: hasSpecialChar },
  ];

  const isValid = minLength && maxLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      color: 'bg-slate-600',
      textColor: 'text-slate-400',
      bgLightColor: 'bg-slate-800',
      rules: { minLength, maxLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar },
      isValid: false,
      checklist,
    };
  }

  // Calculate score (0 to 100)
  let score = 0;
  if (minLength) score += 20;
  if (password.length >= 12) score += 10;
  if (hasUppercase) score += 15;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 20;
  if (hasSpecialChar) score += 20;

  // Cap at 100
  score = Math.min(100, score);

  let label: PasswordStrengthResult['label'] = 'Very Weak';
  let color = 'bg-rose-500';
  let textColor = 'text-rose-400';
  let bgLightColor = 'bg-rose-500/10 border-rose-500/20';

  if (score < 30) {
    label = 'Very Weak';
    color = 'bg-rose-500';
    textColor = 'text-rose-400';
    bgLightColor = 'bg-rose-500/10 border-rose-500/20';
  } else if (score < 50) {
    label = 'Weak';
    color = 'bg-orange-500';
    textColor = 'text-orange-400';
    bgLightColor = 'bg-orange-500/10 border-orange-500/20';
  } else if (score < 70) {
    label = 'Fair';
    color = 'bg-amber-500';
    textColor = 'text-amber-400';
    bgLightColor = 'bg-amber-500/10 border-amber-500/20';
  } else if (score < 90 || !isValid) {
    label = 'Strong';
    color = 'bg-blue-500';
    textColor = 'text-blue-400';
    bgLightColor = 'bg-blue-500/10 border-blue-500/20';
  } else {
    label = 'Excellent';
    color = 'bg-emerald-500';
    textColor = 'text-emerald-400';
    bgLightColor = 'bg-emerald-500/10 border-emerald-500/20';
  }

  return {
    score,
    label,
    color,
    textColor,
    bgLightColor,
    rules: { minLength, maxLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar },
    isValid,
    checklist,
  };
}
