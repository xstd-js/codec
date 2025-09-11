import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import type { EncodeFunction } from '../../../encoder/types/encode-function.js';
import {
  encodeAsBinaryQuotedPrintable,
  encodeAsTextQuotedPrintable,
} from './encode-as-quoted-printable.js';

function stringToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function byteToString(input: Uint8Array): string {
  return new TextDecoder().decode(input);
}

function encodeUsingString(input: string, encode: EncodeFunction<Uint8Array>): string {
  return byteToString(Encoder.encode(stringToBytes(input), encode));
}

function encodeStringAsTextQuotedPrintable(input: string): string {
  return encodeUsingString(input, encodeAsTextQuotedPrintable);
}

function encodeStringAsBinaryQuotedPrintable(input: string): string {
  return encodeUsingString(input, encodeAsBinaryQuotedPrintable);
}

describe('encodeAsTextQuotedPrintable', () => {
  describe('mode=text', () => {
    test('with only safe chars', () => {
      expect(encodeStringAsTextQuotedPrintable('abc')).toBe('abc');
    });

    test('with unsafe char', () => {
      expect(encodeStringAsTextQuotedPrintable('é')).toBe('=C3=A9');
    });

    test('with safe and unsafe chars', () => {
      expect(encodeStringAsTextQuotedPrintable('aéb=c')).toBe('a=C3=A9b=3Dc');
    });

    test('with only safe chars reaching the limit of the max line length', () => {
      expect(
        encodeStringAsTextQuotedPrintable(
          '0123456789012345678901234567890123456789012345678901234567890123456789012345' /* 76 chars */,
        ),
      ).toBe('0123456789012345678901234567890123456789012345678901234567890123456789012345');
    });

    test('with only safe chars involving a soft line break', () => {
      expect(
        encodeStringAsTextQuotedPrintable(
          '01234567890123456789012345678901234567890123456789012345678901234567890123456789' /* 80 chars */,
        ),
      ).toBe(
        '012345678901234567890123456789012345678901234567890123456789012345678901234=\r\n56789',
      );
    });

    test('with only safe chars involving a meaning full line break', () => {
      expect(encodeStringAsTextQuotedPrintable('012345\r\n6789')).toBe('012345\r\n6789');
    });

    test('with only safe chars reaching the limit of the max line length and involving a meaning full line break', () => {
      expect(
        encodeStringAsTextQuotedPrintable(
          '0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789' /* 76 chars + CRLF + 4 chars */,
        ),
      ).toBe(
        '0123456789012345678901234567890123456789012345678901234567890123456789012345\r\n6789',
      );
    });

    test('with unsafe chars reaching the limit of the max line length and involving a soft line break', () => {
      expect(
        encodeStringAsTextQuotedPrintable(
          '012345678901234567890123456789012345678901234567890123456789012345678901=6789' /* 72 chars + = + 4 chars */,
        ),
      ).toBe(
        '012345678901234567890123456789012345678901234567890123456789012345678901=3D=\r\n6789',
      );

      expect(
        encodeStringAsTextQuotedPrintable(
          '0123456789012345678901234567890123456789012345678901234567890123456789012=6789' /* 73 chars + = + 4 chars */,
        ),
      ).toBe(
        '0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n=3D6789',
      );
    });

    test('with unsafe chars reaching the limit of the max line length and involving a meaning full line break', () => {
      expect(
        encodeStringAsTextQuotedPrintable(
          '0123456789012345678901234567890123456789012345678901234567890123456789012=\r\n6789' /* 73 chars + =  + CRLF + 4 chars */,
        ),
      ).toBe(
        '0123456789012345678901234567890123456789012345678901234567890123456789012=3D\r\n6789',
      );
    });

    describe('with space and tabs', () => {
      test('base', () => {
        expect(encodeStringAsTextQuotedPrintable('a b\tc')).toBe('a b\tc');
      });

      test('not encoded if last', () => {
        expect(encodeStringAsTextQuotedPrintable('ab\t')).toBe('ab\t');
      });

      test('encoded if followed by a line break', () => {
        expect(encodeStringAsTextQuotedPrintable('ab\t\r\nc')).toBe('ab=09\r\nc');
      });

      test('only the last one of the line is encoded', () => {
        expect(encodeStringAsTextQuotedPrintable('ab  \r\nc')).toBe('ab =20\r\nc');
      });

      test('only the last one of the line is encoded and involves a soft line break', () => {
        expect(encodeStringAsTextQuotedPrintable(' '.repeat(80))).toBe(
          '                                                                           =\r\n' +
            '     ',
        );
      });
    });
  });
});

describe('encodeAsBinaryQuotedPrintable', () => {
  describe('mode=binary', () => {
    test('with binary string', () => {
      expect(encodeStringAsBinaryQuotedPrintable('\x3D\x12')).toBe('=3D=12');
    });

    test('with soft line break', () => {
      expect(
        encodeStringAsBinaryQuotedPrintable(
          '01234567890123456789012345678901234567890123456789012345678901234567890123456789' /* 80 chars */,
        ),
      ).toBe(
        '=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=\r\n' +
          '=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=\r\n' +
          '=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=35=36=37=38=39=30=31=32=33=34=\r\n' +
          '=35=36=37=38=39',
      );
    });
  });
});
