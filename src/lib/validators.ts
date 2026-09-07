export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} ist erforderlich`;
  }
  return null;
}

export function validateProjectInput(name: string, _address: string): ValidationResult {
  const errors: Record<string, string> = {};
  const nameErr = validateRequired(name, 'Projektname');
  if (nameErr) errors.name = nameErr;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegistrationInput(
  email: string,
  password: string,
  name: string
): ValidationResult {
  const errors: Record<string, string> = {};
  const nameErr = validateRequired(name, 'Name');
  if (nameErr) errors.name = nameErr;
  if (!validateEmail(email)) {
    errors.email = 'Ungültige E-Mail-Adresse';
  }
  if (!password || password.length < 8) {
    errors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLoginInput(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};
  if (!validateEmail(email)) {
    errors.email = 'Ungültige E-Mail-Adresse';
  }
  if (!password || password.length === 0) {
    errors.password = 'Passwort ist erforderlich';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePasswordChangeInput(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): ValidationResult {
  const errors: Record<string, string> = {};
  if (!currentPassword || currentPassword.length === 0) {
    errors.currentPassword = 'Aktuelles Passwort ist erforderlich';
  }
  if (!newPassword || newPassword.length < 8) {
    errors.newPassword = 'Neues Passwort muss mindestens 8 Zeichen lang sein';
  }
  if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Die Passwörter stimmen nicht überein';
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = 'Das neue Passwort muss sich vom aktuellen unterscheiden';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
