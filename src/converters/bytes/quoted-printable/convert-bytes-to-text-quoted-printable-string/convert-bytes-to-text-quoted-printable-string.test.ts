import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../encoder/encoder.js';
import { convertBytesToTextQuotedPrintableString } from './convert-bytes-to-text-quoted-printable-string.js';

describe('convertBytesToBinaryQuotedPrintableString', () => {
  const convert = (input: string): string => {
    return convertBytesToTextQuotedPrintableString(
      new Encoder().string(input, { encoding: 'utf-8' }).toDecoder(),
      new Encoder(),
    )
      .toDecoder()
      .string(undefined, {
        encoding: 'utf-8',
      });
  };

  test('with only safe chars', () => {
    expect(convert('abc')).toBe('abc');
  });

  test('with unsafe char', () => {
    expect(convert('é')).toBe('=C3=A9');
  });

  test('with safe and unsafe chars', () => {
    expect(convert('aéb=c')).toBe('a=C3=A9b=3Dc');
  });

  test('with only safe chars reaching the limit of the max line length', () => {
    expect(
      convert(
        '0123456789012345678901234567890123456789012345678901234567890123456789012345' /* 76 chars */,
      ),
    ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012345');
  });

  test('with only safe chars involving a soft line break', () => {
    expect(
      convert(
        '01234567890123456789012345678901234567890123456789012345678901234567890123456789' /* 80 chars */,
      ),
    ).toBe('012345678901234567890123456789012345678901234567890123456789012345678901234=\r\n56789');
  });

  test('with only safe chars involving a meaning full line break', () => {
    expect(convert('012345\r\n6789')).toBe('012345\r\n6789');
  });

  test('with only safe chars reaching the limit of the max line length and involving a meaning full line break', () => {
    expect(
      convert(
        '0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789' /* 76 chars + CRLF + 4 chars */,
      ),
    ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789');
  });

  test('with unsafe chars reaching the limit of the max line length and involving a soft line break', () => {
    expect(
      convert(
        '012345678901234567890123456789012345678901234567890123456789012345678901=6789' /* 72 chars + = + 4 chars */,
      ),
    ).toBe('012345678901234567890123456789012345678901234567890123456789012345678901=3D=\r\n6789');

    expect(
      convert(
        '0123456789012345678901234567890123456789012345678901234567890123456789012=6789' /* 73 chars + = + 4 chars */,
      ),
    ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n=3D6789');
  });

  test('with unsafe chars reaching the limit of the max line length and involving a meaning full line break', () => {
    expect(
      convert(
        '0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n6789' /* 73 chars + =  + CRLF + 4 chars */,
      ),
    ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012=3D\r\n6789');
  });

  describe('with space and tabs', () => {
    test('base', () => {
      expect(convert('a b\tc')).toBe('a b\tc');
    });

    test('not encoded if last', () => {
      expect(convert('ab\t')).toBe('ab\t');
    });

    test('encoded if followed by a line break', () => {
      expect(convert('ab\t\r\nc')).toBe('ab=09\r\nc');
    });

    test('only the last one of the line is encoded', () => {
      expect(convert('ab  \r\nc')).toBe('ab =20\r\nc');
    });

    test('only the last one of the line is encoded and involves a soft line break', () => {
      expect(convert(' '.repeat(80))).toBe(
        '                                                                           =\r\n' +
          '     ',
      );
    });
  });
});
