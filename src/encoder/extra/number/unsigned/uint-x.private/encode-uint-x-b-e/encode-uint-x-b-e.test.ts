import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUintXBE } from './encode-uint-x-b-e.js';

describe('encodeUintXBE', () => {
  const encode = (input: bigint | number, bytes: number): number[] => {
    return Array.from(
      new Encoder()
        .encode(input, (encoder: Encoder, value: bigint | number) =>
          encodeUintXBE(encoder, value, bytes),
        )
        .toUint8Array(),
    );
  };

  test('0xff => [0xff]', () => {
    expect(encode(0xff, 1)).toEqual([0xff]);
  });

  test('0x1234 (1B) => [0x34]', () => {
    expect(encode(0x1234, 1)).toEqual([0x34]);
  });

  test('0x1234 => [0x12, 0x34]', () => {
    expect(encode(0x1234, 2)).toEqual([0x12, 0x34]);
  });

  test('0x12345678_90123456n => [0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56]', () => {
    expect(encode(0x12345678_90123456n, 8)).toEqual([
      0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56,
    ]);
  });
});
