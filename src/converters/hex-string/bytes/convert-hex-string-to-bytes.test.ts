import { describe, expect, it, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import {
  convertHexStringToBytes,
  type ConvertHexStringToBytesOptions,
} from './convert-hex-string-to-bytes.js';

describe('convertHexStringToBytes', () => {
  const convert = (input: string, options?: ConvertHexStringToBytesOptions): string => {
    return convertHexStringToBytes(
      new Encoder().string(input, { encoding: 'binary' }).toDecoder(),
      new Encoder(),
      undefined,
      options,
    )
      .toDecoder()
      .string(undefined, {
        encoding: 'binary',
      });
  };

  it('should throw if number of bytes is not a multiple of 2', () => {
    expect(() => convert('f31')).toThrow();
  });

  describe('uppercase=either', () => {
    test('bytes sequence', () => {
      expect(convert('f31A')).toBe('\xf3\x1a');
    });
  });

  describe('uppercase=no', () => {
    const options: ConvertHexStringToBytesOptions = {
      uppercase: 'no',
    };

    test('valid bytes sequence', () => {
      expect(convert('f31a', options)).toBe('\xf3\x1a');
    });

    test('invalid bytes sequence', () => {
      expect(() => convert('F31a', options)).toThrow();
    });
  });

  describe('uppercase=yes', () => {
    const options: ConvertHexStringToBytesOptions = {
      uppercase: 'yes',
    };

    test('valid bytes sequence', () => {
      expect(convert('F31A', options)).toBe('\xf3\x1a');
    });

    test('invalid bytes sequence', () => {
      expect(() => convert('F31a', options)).toThrow();
    });
  });
});
