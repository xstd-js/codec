import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeInt56LE } from './encode-int56-l-e.js';

describe('encodeInt56LE', () => {
  const encode = (input: bigint | number): number[] => {
    return Array.from(Encoder.encode(input, encodeInt56LE));
  };

  test('0x12345678_901234n => [0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_901234n)).toEqual([0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]);
  });

  test('-1 => [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]', () => {
    expect(encode(-1n)).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  });
});
