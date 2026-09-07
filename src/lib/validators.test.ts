import { describe, it, expect } from 'vitest';
import { validateEmail, validateRequired, validateProjectInput, validateRegistrationInput, validateLoginInput } from './validators';

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});

describe('validateRequired', () => {
  it('should return null for non-empty values', () => {
    expect(validateRequired('hello', 'Field')).toBeNull();
    expect(validateRequired('  spaced  ', 'Field')).toBeNull();
  });

  it('should return error for empty values', () => {
    expect(validateRequired('', 'Name')).toBe('Name ist erforderlich');
    expect(validateRequired('   ', 'Name')).toBe('Name ist erforderlich');
  });
});

describe('validateProjectInput', () => {
  it('should validate a valid project', () => {
    const result = validateProjectInput('Mein Bauprojekt', 'Musterstr. 123');
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should reject empty name', () => {
    const result = validateProjectInput('', 'Musterstr. 123');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });
});

describe('validateRegistrationInput', () => {
  it('should validate correct registration data', () => {
    const result = validateRegistrationInput('user@example.com', 'password123', 'Max Mustermann');
    expect(result.valid).toBe(true);
  });

  it('should reject short passwords', () => {
    const result = validateRegistrationInput('user@example.com', '123', 'Max');
    expect(result.valid).toBe(false);
    expect(result.errors.password).toContain('8 Zeichen');
  });

  it('should reject invalid email', () => {
    const result = validateRegistrationInput('invalid', 'password123', 'Max');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toContain('E-Mail');
  });

  it('should reject empty name', () => {
    const result = validateRegistrationInput('user@example.com', 'password123', '');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });
});

describe('validateLoginInput', () => {
  it('should validate correct login data', () => {
    const result = validateLoginInput('user@example.com', 'password123');
    expect(result.valid).toBe(true);
  });

  it('should reject empty password', () => {
    const result = validateLoginInput('user@example.com', '');
    expect(result.valid).toBe(false);
    expect(result.errors.password).toContain('Passwort ist erforderlich');
  });
});
