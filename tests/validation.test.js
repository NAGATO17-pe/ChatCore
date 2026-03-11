import { describe, expect, it } from 'vitest';
import { isValidMessage, normalizeUsername } from '../src/validation.js';

describe('normalizeUsername', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(normalizeUsername('  Juan Perez ')).toBe('juan_perez');
  });
});

describe('isValidMessage', () => {
  it('acepta mensajes válidos', () => {
    expect(isValidMessage('hola')).toBe(true);
  });

  it('rechaza vacíos', () => {
    expect(isValidMessage('   ')).toBe(false);
  });
});
