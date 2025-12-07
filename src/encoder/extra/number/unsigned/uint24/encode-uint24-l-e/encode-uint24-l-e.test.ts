import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUint24LE } from './encode-uint24-l-e.js';

describe('encodeUint24LE', () => {
  const encode = (input: number): number[] => {
    return Array.from(Encoder.encode(input, encodeUint24LE));
  };

  test('0xff => [0xff, 0x00, 0x00]', () => {
    expect(encode(0xff)).toEqual([0xff, 0x00, 0x00]);
  });

  test('0x1234 => [0x34, 0x12, 0x00]', () => {
    expect(encode(0x1234)).toEqual([0x34, 0x12, 0x00]);
  });

  test('0x123456 => [0x56, 0x34, 0x12]', () => {
    expect(encode(0x123456)).toEqual([0x56, 0x34, 0x12]);
  });
});
