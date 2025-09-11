import { describe, expect, test } from 'vitest';
import { singleAlphanumericToNumber } from './single-alphanumeric-to-number.js';

describe('singleAlphanumericToNumber', () => {
  test('2', () => {
    expect(singleAlphanumericToNumber('2'.charCodeAt(0))).toBe(0x02);
  });

  test('C', () => {
    expect(singleAlphanumericToNumber('C'.charCodeAt(0))).toBe(0x0c);
  });

  test('c', () => {
    expect(singleAlphanumericToNumber('c'.charCodeAt(0))).toBe(0x0c);
  });

  test('uppercase=yes', () => {
    expect(singleAlphanumericToNumber('C'.charCodeAt(0), 'yes')).toBe(0x0c);
    expect(() => singleAlphanumericToNumber('c'.charCodeAt(0), 'yes')).toThrow();
  });

  test('uppercase=no', () => {
    expect(singleAlphanumericToNumber('c'.charCodeAt(0), 'no')).toBe(0x0c);
    expect(() => singleAlphanumericToNumber('C'.charCodeAt(0), 'no')).toThrow();
  });
});
