import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeInt48LE } from './encode-int48-l-e.js';

describe('encodeInt48LE', () => {
  const encode = (input: number): number[] => {
    return Array.from(Encoder.encode(input, encodeInt48LE));
  };

  test('0x12345678_9012 => [0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_9012)).toEqual([0x12, 0x90, 0x78, 0x56, 0x34, 0x12]);
  });

  test('-1 => [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]', () => {
    expect(encode(-1)).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  });
});
