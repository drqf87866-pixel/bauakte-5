import { describe, it, expect } from 'vitest';
import { getInitials, getAvatarStyle } from './avatar';

describe('getInitials', () => {
  it('should return initials from first and last name', () => {
    expect(getInitials('Max Mustermann')).toBe('MM');
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('should handle single word names', () => {
    expect(getInitials('Anja')).toBe('AN');
    expect(getInitials('X')).toBe('X');
  });

  it('should handle three-part names', () => {
    expect(getInitials('Hans Peter Müller')).toBe('HM');
  });

  it('should handle empty or whitespace', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getAvatarStyle', () => {
  it('should return a valid style object', () => {
    const style = getAvatarStyle('Test User');
    expect(style).toHaveProperty('bg');
    expect(style).toHaveProperty('text');
    expect(style.text).toBe('text-white');
  });

  it('should be deterministic (same input = same output)', () => {
    const a = getAvatarStyle('Max Mustermann');
    const b = getAvatarStyle('Max Mustermann');
    expect(a).toEqual(b);
  });

  it('should return different colors for different names', () => {
    const styles = new Set(
      ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].map(getAvatarStyle)
    );
    // At least some should be different
    expect(styles.size).toBeGreaterThan(1);
  });
});
