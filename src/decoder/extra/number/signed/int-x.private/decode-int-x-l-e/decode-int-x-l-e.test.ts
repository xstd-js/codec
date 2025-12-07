import { describe, expect, test } from 'vitest';
import { Decoder } from '../../../../../decoder.js';
import { decodeIntXLE } from './decode-int-x-l-e.js';

describe('decodeIntXLE', () => {
  const decode = (input: number[], bytes: number): bigint => {
    return decodeIntXLE(new Decoder(new Uint8Array(input)), bytes);
  };

  test('[0xff] => -1', () => {
    expect(decode([0xff], 1)).toBe(-1n);
  });

  test('[0x34, 0x12] (1B) => 0x34', () => {
    expect(decode([0x34, 0x12], 1)).toBe(0x34n);
  });

  test('[0xff, 0xff] => -1', () => {
    expect(decode([0xff, 0xff], 2)).toBe(-1n);
  });

  test('[0x34, 0x12] => 0x1234', () => {
    expect(decode([0x34, 0x12], 2)).toBe(0x1234n);
  });

  test('[0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12] => 0x12345678_90123456n', () => {
    expect(decode([0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12], 8)).toBe(0x12345678_90123456n);
  });
});
