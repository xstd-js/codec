import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeUintXLE } from './encode-uint-x-l-e.js';

describe('encodeUintXLE', () => {
  const encode = (input: bigint | number, bytes: number): number[] => {
    return Array.from(
      new Encoder()
        .encode(input, (encoder: Encoder, value: bigint | number) =>
          encodeUintXLE(encoder, value, bytes),
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

  test('0x1234 => [0x34, 0x12]', () => {
    expect(encode(0x1234, 2)).toEqual([0x34, 0x12]);
  });

  test('0x12345678_90123456n => [0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_90123456n, 8)).toEqual([
      0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12,
    ]);
  });
});
