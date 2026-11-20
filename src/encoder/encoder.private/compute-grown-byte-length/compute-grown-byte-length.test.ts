import { describe, expect, test } from 'vitest';
import { computeGrownByteLength } from './compute-grown-byte-length.js';

describe('computeGrownByteLength', () => {
  test('below 2GiB: doubles with a half-byte margin', () => {
    expect(computeGrownByteLength(0x100, 0x100000000)).toBe(0x200);
    expect(computeGrownByteLength(2 ** 20, 0x100000000)).toBe(2 ** 21);
  });

  test('beyond 2GiB: must not wrap around int32', () => {
    expect(computeGrownByteLength(2 ** 31, 2 ** 32)).toBe(2 ** 32);
    expect(computeGrownByteLength(1.6e9, 2 ** 32)).toBe(2 ** 32);
  });
});
