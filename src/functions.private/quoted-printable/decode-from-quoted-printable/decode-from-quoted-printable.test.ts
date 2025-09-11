import { describe, expect, test } from 'vitest';
import { decodeFromQuotedPrintable } from './decode-from-quoted-printable.js';

function stringToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function byteToString(input: Uint8Array): string {
  return new TextDecoder().decode(input);
}

function decodeStringFromQuotedPrintable(input: string): string {
  return byteToString(decodeFromQuotedPrintable(stringToBytes(input)));
}

describe('decodeFromQuotedPrintable', () => {
  test('quoted-printable string', () => {
    const input = `J'interdis aux marchands de vanter trop leurs marchandises. Car ils se font=
 vite p=C3=A9dagogues et t'enseignent comme but ce qui n'est par essence qu=
'un moyen, et te trompant ainsi sur la route =C3=A0 suivre les voil=C3=A0 b=
ient=C3=B4t qui te d=C3=A9gradent, car si leur musique est vulgaire ils te =
fabriquent pour te la vendre une =C3=A2me vulgaire.

   =E2=80=94=E2=80=89Antoine de Saint-Exup=C3=A9ry, Citadelle (1948)`.replaceAll('\n', '\r\n');

    const output =
      `J'interdis aux marchands de vanter trop leurs marchandises. Car ils se font vite pédagogues et t'enseignent comme but ce qui n'est par essence qu'un moyen, et te trompant ainsi sur la route à suivre les voilà bientôt qui te dégradent, car si leur musique est vulgaire ils te fabriquent pour te la vendre une âme vulgaire.

   — Antoine de Saint-Exupéry, Citadelle (1948)`.replaceAll('\n', '\r\n');

    expect(decodeStringFromQuotedPrintable(input)).toBe(output);
  });

  describe('invalid quoted-printable string', () => {
    describe('around equal sign: =XX', () => {
      test('not enough chars after =', () => {
        expect(() => decodeStringFromQuotedPrintable('=C')).toThrow();
      });

      test('not alphanumerical after =', () => {
        expect(() => decodeStringFromQuotedPrintable('=G0')).toThrow();

        expect(() => decodeStringFromQuotedPrintable('=0G')).toThrow();
      });

      test('expect LF after CR', () => {
        expect(() => decodeStringFromQuotedPrintable('=\rA')).toThrow();
      });
    });

    describe('around CRLF', () => {
      test('not enough chars after CR', () => {
        expect(() => decodeStringFromQuotedPrintable('\r')).toThrow();
      });

      test('expect LF after CR', () => {
        expect(() => decodeStringFromQuotedPrintable('\rA')).toThrow();
      });
    });
  });

  describe('out of spec', () => {
    test('lowercase alphanumerical after =', () => {
      expect(decodeStringFromQuotedPrintable('=3d')).toBe('=');
    });

    test('trailing white space', () => {
      expect(decodeStringFromQuotedPrintable('a   \r\n')).toBe('a\r\n');
    });
  });
});
