import { describe, expect, test } from 'vitest';
import { Decoder } from '../../../../../decoder.js';
import { decodeIntXBE } from './decode-int-x-b-e.js';

describe('decodeIntXBE', () => {
  const decode = (input: number[], bytes: number): bigint => {
    return decodeIntXBE(new Decoder(new Uint8Array(input)), bytes);
  };

  test('[0xff] => -1', () => {
    expect(decode([0xff], 1)).toBe(-1n);
  });

  test('[0xff, 0xff] => -1', () => {
    expect(decode([0xff, 0xff], 2)).toBe(-1n);
  });

  test('[0x12, 0x34] (1B) => 0x34', () => {
    expect(decode([0x12, 0x34], 1)).toBe(0x12n);
  });

  test('[0x12, 0x34] => 0x1234', () => {
    expect(decode([0x12, 0x34], 2)).toBe(0x1234n);
  });

  test('[0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56] => 0x12345678_90123456n', () => {
    expect(decode([0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56], 8)).toBe(0x12345678_90123456n);
  });
});
