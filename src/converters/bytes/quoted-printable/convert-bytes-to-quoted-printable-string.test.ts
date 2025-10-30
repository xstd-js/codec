import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import {
  convertBytesToQuotedPrintableString,
  ConvertBytesToQuotedPrintableStringOptions,
} from './convert-bytes-to-quoted-printable-string.js';

describe('convertBytesToQuotedPrintableString', () => {
  const convert = (input: string, options?: ConvertBytesToQuotedPrintableStringOptions): string => {
    return convertBytesToQuotedPrintableString(
      new Encoder().string(input, { encoding: 'binary' }).toDecoder(),
      new Encoder(),
      undefined,
      options,
    )
      .toDecoder()
      .string(undefined, {
        encoding: 'utf-8',
      });
  };

  test('mode=text', () => {
    expect(convert('aéb')).toBe('a=E9b');

    expect(
      convert('aéb', {
        mode: 'text',
      }),
    ).toBe('a=E9b');
  });

  test('mode=binary', () => {
    expect(
      convert('\x3D\x12', {
        mode: 'binary',
      }),
    ).toBe('=3D=12');
  });

  test('mode=invalid', () => {
    expect(() =>
      convert('abc', {
        mode: 'invalid' as any,
      }),
    ).toThrow();
  });
});
