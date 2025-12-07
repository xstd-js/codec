import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../../encoder.js';
import { encodeIntXLE } from './encode-int-x-l-e.js';

describe('encodeIntXLE', () => {
  // https://www.simonv.fr/TypesConvert/?integers

  const encode = (input: bigint | number, bytes: number): number[] => {
    return Array.from(
      new Encoder()
        .encode(input, (encoder: Encoder, value: bigint | number) =>
          encodeIntXLE(encoder, value, bytes),
        )
        .toUint8Array(),
    );
  };

  test('0xfc (-4) => [0xff]', () => {
    expect(encode(0xfc, 1)).toEqual([0xfc]);
    expect(encode(-4, 1)).toEqual([0xfc]);
  });

  test('0xf95c (-1700) (2B) => [0xff]', () => {
    expect(encode(0xf95c, 2)).toEqual([0x5c, 0xf9]);
    expect(encode(-1700, 2)).toEqual([0x5c, 0xf9]);
  });

  test('0xbd98 (-17000) (2B) => [0xff]', () => {
    expect(encode(0xbd98, 2)).toEqual([0x98, 0xbd]);
    expect(encode(-17000, 2)).toEqual([0x98, 0xbd]);
  });

  test('0x12345678_90123456n => [0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12]', () => {
    expect(encode(0x12345678_90123456n, 8)).toEqual([
      0x56, 0x34, 0x12, 0x90, 0x78, 0x56, 0x34, 0x12,
    ]);
  });
});
