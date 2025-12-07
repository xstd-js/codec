import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUint40LE } from './encode-uint40-l-e.js';

describe('encodeUint40LE', () => {
  const encode = (input: number): number[] => {
    return Array.from(Encoder.encode(input, encodeUint40LE));
  };

  test('0x12345678_90 => [0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_90)).toEqual([0x90, 0x78, 0x56, 0x34, 0x12]);
  });
});
