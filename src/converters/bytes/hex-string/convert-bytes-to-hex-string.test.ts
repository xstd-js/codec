import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import {
  convertBytesToHexString,
  type ConvertBytesToHexStringOptions,
} from './convert-bytes-to-hex-string.js';

describe('convertBytesToHexString', () => {
  const convert = (input: string, options?: ConvertBytesToHexStringOptions): string => {
    return convertBytesToHexString(
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

  describe('uppercase=false', () => {
    test('bytes sequence', () => {
      expect(convert('\xf3\x1a')).toBe('f31a');
    });
  });

  describe('uppercase=true', () => {
    test('bytes sequence', () => {
      expect(convert('\xf3\x1a', { uppercase: true })).toBe('F31A');
    });
  });
});
