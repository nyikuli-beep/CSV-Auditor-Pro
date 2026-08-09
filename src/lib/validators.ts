export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates email format using standard RFC 5322 regex pattern.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, message: 'Email address is required.' };
  }

  const trimmed = email.trim();
  // Standard email format regex rejecting missing domain, TLD, or @
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g. name@company.com).' };
  }

  return { isValid: true };
}

/**
 * Validates display name
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Full name is required.' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters long.' };
  }
  return { isValid: true };
}

export const validateFullName = validateName;
