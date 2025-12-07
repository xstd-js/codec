import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeIntXBE } from './encode-int-x-b-e.js';

describe('encodeIntXBE', () => {
  const encode = (input: bigint | number, bytes: number): number[] => {
    return Array.from(
      new Encoder()
        .encode(input, (encoder: Encoder, value: bigint | number) =>
          encodeIntXBE(encoder, value, bytes),
        )
        .toUint8Array(),
    );
  };

  test('0xfc (-4) => [0xfc]', () => {
    expect(encode(0xfc, 1)).toEqual([0xfc]);
    expect(encode(-4, 1)).toEqual([0xfc]);
  });

  test('-1 => [0xff]', () => {
    expect(encode(-1, 1)).toEqual([0xff]);
  });

  test('-1 (2B) => [0xff, 0xff]', () => {
    expect(encode(-1, 2)).toEqual([0xff, 0xff]);
  });

  test('0xf95c (-1700) (2B) => [0xf9, 0x5c]', () => {
    expect(encode(0xf95c, 2)).toEqual([0xf9, 0x5c]);
    expect(encode(-1700, 2)).toEqual([0xf9, 0x5c]);
  });

  test('0xbd98 (-17000) (2B) => [0xbd, 0x98]', () => {
    expect(encode(0xbd98, 2)).toEqual([0xbd, 0x98]);
    expect(encode(-17000, 2)).toEqual([0xbd, 0x98]);
  });

  test('0x12345678_90123456n => [0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56,]', () => {
    expect(encode(0x12345678_90123456n, 8)).toEqual([
      0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56,
    ]);
  });
});
