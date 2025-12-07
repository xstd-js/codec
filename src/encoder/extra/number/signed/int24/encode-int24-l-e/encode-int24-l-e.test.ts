import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeInt24LE } from './encode-int24-l-e.js';

describe('encodeInt24LE', () => {
  const encode = (input: number): number[] => {
    return Array.from(Encoder.encode(input, encodeInt24LE));
  };

  test('0xff => [0xff, 0x00, 0x00]', () => {
    expect(encode(0xff)).toEqual([0xff, 0x00, 0x00]);
  });

  test('-1 => [0xff, 0xff, 0xff]', () => {
    expect(encode(-1)).toEqual([0xff, 0xff, 0xff]);
  });

  test('0x1234 => [0x34, 0x12, 0x00]', () => {
    expect(encode(0x1234)).toEqual([0x34, 0x12, 0x00]);
  });

  test('0x123456 => [0x56, 0x34, 0x12]', () => {
    expect(encode(0x123456)).toEqual([0x56, 0x34, 0x12]);
  });
});
