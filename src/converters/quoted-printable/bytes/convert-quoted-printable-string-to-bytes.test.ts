import { describe, expect, test } from 'vitest';
import { Encoder } from '../../../encoder/encoder.js';
import { convertQuotedPrintableStringToBytes } from './convert-quoted-printable-string-to-bytes.js';

describe('convertQuotedPrintableStringToBytes', () => {
  const convert = (input: string): string => {
    return convertQuotedPrintableStringToBytes(
      new Encoder().string(input, { encoding: 'utf-8' }).toDecoder(),
      new Encoder(),
    )
      .toDecoder()
      .string(undefined, {
        encoding: 'utf-8',
      });
  };

  const normalizeLineSeparators = (input: string): string => {
    return input.replaceAll('\n', '\r\n');
  };

  test('quoted-printable string', () => {
    expect(
      convert(
        normalizeLineSeparators(`J'interdis aux marchands de vanter trop leurs marchandises. Car ils se font=
 vite p=C3=A9dagogues et t'enseignent comme but ce qui n'est par essence qu=
'un moyen, et te trompant ainsi sur la route =C3=A0 suivre les voil=C3=A0 b=
ient=C3=B4t qui te d=C3=A9gradent, car si leur musique est vulgaire ils te =
fabriquent pour te la vendre une =C3=A2me vulgaire.

   =E2=80=94=E2=80=89Antoine de Saint-Exup=C3=A9ry, Citadelle (1948)`),
      ),
    ).toBe(
      normalizeLineSeparators(`J'interdis aux marchands de vanter trop leurs marchandises. Car ils se font vite pédagogues et t'enseignent comme but ce qui n'est par essence qu'un moyen, et te trompant ainsi sur la route à suivre les voilà bientôt qui te dégradent, car si leur musique est vulgaire ils te fabriquent pour te la vendre une âme vulgaire.

   — Antoine de Saint-Exupéry, Citadelle (1948)`),
    );
  });

  describe('invalid quoted-printable string', () => {
    describe('around equal sign: =XX', () => {
      test('not enough chars after =', () => {
        expect(() => convert('=C')).toThrow();
      });

      test('not alphanumerical after =', () => {
        expect(() => convert('=G0')).toThrow();

        expect(() => convert('=0G')).toThrow();
      });

      test('expect LF after CR', () => {
        expect(() => convert('=\rA')).toThrow();
      });
    });

    describe('around CRLF', () => {
      test('not enough chars after CR', () => {
        expect(() => convert('\r')).toThrow();
      });

      test('expect LF after CR', () => {
        expect(() => convert('\rA')).toThrow();
      });
    });
  });

  describe('out of spec', () => {
    test('lowercase alphanumerical after =', () => {
      expect(convert('=3d')).toBe('=');
    });

    test('trailing white space', () => {
      expect(convert('a   \r\n')).toBe('a\r\n');
    });
  });
});
