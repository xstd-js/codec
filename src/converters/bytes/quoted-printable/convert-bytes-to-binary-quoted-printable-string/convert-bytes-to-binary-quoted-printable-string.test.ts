import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../../encoder/encoder.js';
import { convertBytesToBinaryQuotedPrintableString } from './convert-bytes-to-binary-quoted-printable-string.js';

describe('convertBytesToBinaryQuotedPrintableString', () => {
  const convert = (input: string): string => {
    return convertBytesToBinaryQuotedPrintableString(
      new Encoder().string(input, { encoding: 'binary' }).toDecoder(),
      new Encoder(),
    )
      .toDecoder()
      .string(undefined, {
        encoding: 'utf-8',
      });
  };

  test('with binary string', () => {
    expect(convert('\x3D\x12')).toBe('=3D=12');
  });

  test('with soft line break', () => {
    expect(
      convert(
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
