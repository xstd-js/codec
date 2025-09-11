import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import {
  convertBytesToBase64String,
  type ConvertBytesToBase64StringOptions,
} from './convert-bytes-to-base64-string.js';

describe('convertBytesToBase64String', () => {
  const convert = (input: string, options?: ConvertBytesToBase64StringOptions): string => {
    return convertBytesToBase64String(
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
    expect(convert('foob')).toBe('Zm9vYg==');
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
      expect(convert(str)).toBe(btoa(str));
    }

    expect(convert(toBinaryString(0x0affff))).toBe(btoa(toBinaryString(0x0affff)));
  });

  describe('alphabet=base64', () => {
    describe('omitPadding=false', () => {
      test('with various inputs', () => {
        const options: ConvertBytesToBase64StringOptions = {
          alphabet: 'base64',
          omitPadding: false,
        };

        expect(convert('', options)).toBe('');
        expect(convert('f', options)).toBe('Zg==');
        expect(convert('fo', options)).toBe('Zm8=');
        expect(convert('foo', options)).toBe('Zm9v');
        expect(convert('foob', options)).toBe('Zm9vYg==');
        expect(convert('fooba', options)).toBe('Zm9vYmE=');
        expect(convert('foobar', options)).toBe('Zm9vYmFy');
        expect(convert('Óÿ', options)).toBe('0/8=');
        expect(convert('ûï¾', options)).toBe('++++');
      });
    });

    describe('omitPadding=true', () => {
      test('with various inputs', () => {
        const options: ConvertBytesToBase64StringOptions = {
          alphabet: 'base64',
          omitPadding: true,
        };

        expect(convert('', options)).toBe('');
        expect(convert('f', options)).toBe('Zg');
        expect(convert('fo', options)).toBe('Zm8');
        expect(convert('foo', options)).toBe('Zm9v');
        expect(convert('foob', options)).toBe('Zm9vYg');
        expect(convert('fooba', options)).toBe('Zm9vYmE');
        expect(convert('foobar', options)).toBe('Zm9vYmFy');
        expect(convert('Óÿ', options)).toBe('0/8');
        expect(convert('ûï¾', options)).toBe('++++');
      });
    });
  });

  describe('alphabet=base64url', () => {
    describe('omitPadding=false', () => {
      test('with various inputs', () => {
        const options: ConvertBytesToBase64StringOptions = {
          alphabet: 'base64url',
          omitPadding: false,
        };

        expect(convert('fooba', options)).toBe('Zm9vYmE=');
        expect(convert('foobar', options)).toBe('Zm9vYmFy');
        expect(convert('Óÿ', options)).toBe('0_8=');
        expect(convert('ûï¾', options)).toBe('----');
      });
    });

    describe('omitPadding=true', () => {
      test('with various inputs', () => {
        const options: ConvertBytesToBase64StringOptions = {
          alphabet: 'base64url',
          omitPadding: true,
        };

        expect(convert('fooba', options)).toBe('Zm9vYmE');
        expect(convert('foobar', options)).toBe('Zm9vYmFy');
        expect(convert('Óÿ', options)).toBe('0_8');
        expect(convert('ûï¾', options)).toBe('----');
      });
    });
  });
});
