import { describe, expect, test } from 'vitest';
import { numberToSingleAlphanumeric } from './number-to-single-alphanumeric.js';

describe('numberToSingleAlphanumeric', () => {
  test('2', () => {
    expect(numberToSingleAlphanumeric(0x02, false)).toBe('2'.charCodeAt(0));
  });

  test('C', () => {
    expect(numberToSingleAlphanumeric(0x0c, true)).toBe('C'.charCodeAt(0));
  });

  test('c', () => {
    expect(numberToSingleAlphanumeric(0x0c, false)).toBe('c'.charCodeAt(0));
  });

  test('out of range', () => {
    expect(() => numberToSingleAlphanumeric(0x10, false)).toThrow();
  });
});
