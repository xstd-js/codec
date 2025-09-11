import { describe, expect, it, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import {
  convertBase64StringToBytes,
  type ConvertBase64StringToBytesOptions,
} from './convert-base64-string-to-bytes.js';

describe('decodeBase64StringAsDecoder', () => {
  const convert = (input: string, options?: ConvertBase64StringToBytesOptions): string => {
    return convertBase64StringToBytes(
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

  test('default', () => {
    expect(convert('Zm9vYg==')).toBe('foob');
  });

  test('[0-0xffff]', () => {
    const toBinaryString = (value: number): string => {
      let output: string = '';

      while (value > 0) {
        output += String.fromCharCode(value & 0xff);
        value >>>= 8;
      }

      return output;
    };

    for (let i: number = 0; i < 0xffff; i++) {
      const str: string = toBinaryString(i);
      expect(convert(btoa(str))).toBe(str);
    }

    expect(convert(btoa(toBinaryString(0x0affff)))).toBe(toBinaryString(0x0affff));
  });

  describe('errors', () => {
    it('should throw if it contains invalid chars', () => {
      expect(() => convert('&===', { omitPadding: false })).toThrow();
    });

    describe('omitPadding=false', () => {
      it('should throw if number of bytes is not a multiple of 4', () => {
        expect(() => convert('a', { omitPadding: false })).toThrow();
        expect(() => convert('ab', { omitPadding: false })).toThrow();
        expect(() => convert('abc', { omitPadding: false })).toThrow();
      });
    });

    describe('omitPadding=true', () => {
      it('should throw if number of bytes modulo 4 is equal to 1', () => {
        expect(() => convert('a', { omitPadding: true })).toThrow();
      });
    });
  });

  describe('alphabet=base64', () => {
    describe('omitPadding=false', () => {
      test('with various inputs', () => {
        const options: ConvertBase64StringToBytesOptions = {
          alphabet: 'base64',
          omitPadding: false,
        };

        expect(convert('', options)).toBe('');
        expect(convert('Zg==', options)).toBe('f');
        expect(convert('Zm8=', options)).toBe('fo');
        expect(convert('Zm9v', options)).toBe('foo');
        expect(convert('Zm9vYg==', options)).toBe('foob');
        expect(convert('Zm9vYmE=', options)).toBe('fooba');
        expect(convert('Zm9vYmFy', options)).toBe('foobar');
        expect(convert('0/8=', options)).toBe('Óÿ');
        expect(convert('++++', options)).toBe('ûï¾');
      });
    });

    describe('omitPadding=true', () => {
      test('with various inputs', () => {
        const options: ConvertBase64StringToBytesOptions = {
          alphabet: 'base64',
          omitPadding: true,
        };

        expect(convert('', options)).toBe('');
        expect(convert('Zg', options)).toBe('f');
        expect(convert('Zm8', options)).toBe('fo');
        expect(convert('Zm9v', options)).toBe('foo');
        expect(convert('Zm9vYg', options)).toBe('foob');
        expect(convert('Zm9vYmE', options)).toBe('fooba');
        expect(convert('Zm9vYmFy', options)).toBe('foobar');
        expect(convert('0/8', options)).toBe('Óÿ');
        expect(convert('++++', options)).toBe('ûï¾');
      });
    });
  });

  describe('alphabet=base64url', () => {
    describe('omitPadding=false', () => {
      test('with various inputs', () => {
        const options: ConvertBase64StringToBytesOptions = {
          alphabet: 'base64url',
          omitPadding: false,
        };

        expect(convert('Zm9vYmE=', options)).toBe('fooba');
        expect(convert('Zm9vYmFy', options)).toBe('foobar');
        expect(convert('0_8=', options)).toBe('Óÿ');
        expect(convert('----', options)).toBe('ûï¾');
      });
    });

    describe('omitPadding=true', () => {
      test('with various inputs', () => {
        const options: ConvertBase64StringToBytesOptions = {
          alphabet: 'base64url',
          omitPadding: true,
        };

        expect(convert('Zm9vYmE', options)).toBe('fooba');
        expect(convert('Zm9vYmFy', options)).toBe('foobar');
        expect(convert('0_8', options)).toBe('Óÿ');
        expect(convert('----', options)).toBe('ûï¾');
      });
    });
  });
});
