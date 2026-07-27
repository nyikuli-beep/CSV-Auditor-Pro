/**
 * Form Input Validators for CSV Auditor Pro
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates Email format strictly
 * Accepts: john@gmail.com, alice@yahoo.com, user@company.com
 * Rejects: johngmail.com, john@, @gmail.com, abc, john@gmail
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Email address is required.'
    };
  }

  // Standard strict RFC email format checking for username@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address (e.g. name@company.com).'
    };
  }

  return {
    isValid: true,
    message: ''
  };
}

/**
 * Validates User Full Name
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Full name is required.'
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      message: 'Full name must be at least 2 characters.'
    };
  }

  if (trimmed.length > 70) {
    return {
      isValid: false,
      message: 'Full name must not exceed 70 characters.'
    };
  }

  return {
    isValid: true,
    message: ''
  };
}
