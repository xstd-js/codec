import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUint48LE } from './encode-uint48-l-e.js';

describe('encodeUint48LE', () => {
  const encode = (input: number): number[] => {
    return Array.from(Encoder.encode(input, encodeUint48LE));
  };

  test('0x12345678_9012 => [0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_9012)).toEqual([0x12, 0x90, 0x78, 0x56, 0x34, 0x12]);
  });
});
