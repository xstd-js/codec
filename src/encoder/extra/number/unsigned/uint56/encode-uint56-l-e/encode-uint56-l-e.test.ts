import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUint56LE } from './encode-uint56-l-e.js';

describe('encodeUint56LE', () => {
  const encode = (input: bigint): number[] => {
    return Array.from(Encoder.encode(input, encodeUint56LE));
  };

  test('0x12345678_901234n => [0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_901234n)).toEqual([0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]);
  });
});
