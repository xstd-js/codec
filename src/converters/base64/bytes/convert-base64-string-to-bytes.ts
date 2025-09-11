import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { BASE64_PADDING } from '../../bytes/base64/constants.private/base64-padding.js';
import { BASE64_REVERSE_ALPHABET } from './constants.private/base64-reverse-alphabet.js';
import { BASE64_REVERSE_INVALID } from './constants.private/base64-reverse-invalid.js';
import { BASE64_REVERSE_URL_ALPHABET } from './constants.private/base64-reverse-url-alphabet.js';

export interface ConvertBase64StringToBytesOptions {
  readonly alphabet?: 'base64' | 'base64url';
  readonly omitPadding?: boolean;
}

/**
 * Reads `length` chars represented as _base64_ format from `decoder`,
 * decodes them into the corresponding bytes, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the chars to read and convert to bytes.
 * @param {ConvertBase64StringToBytesOptions} [options]
 * @returns {Encoder} The `output` Encoder with the decoded bytes.
 */
export function convertBase64StringToBytes<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
  { alphabet = 'base64', omitPadding = false }: ConvertBase64StringToBytesOptions = {},
): GOutput {
  if (omitPadding) {
    if (length % 4 === 1) {
      throw new Error(
        'Base64 string without padding got 1 extra character which is not allowed (allowed: 0, 2, 3).',
      );
    }
  } else {
    if (length % 4 !== 0) {
      throw new Error('Base64 string must have a number of characters multiple of 4.');
    }
  }

  const ALPHABET: Uint8Array =
    alphabet === 'base64' ? BASE64_REVERSE_ALPHABET : BASE64_REVERSE_URL_ALPHABET;

  const inputLastSafeIndex: number = omitPadding
    ? Math.floor(length / 4) * 4
    : Math.max(0, length - 4);

  const read6Bits = (): number /* [0, 0x3f] <=> 6bits */ => {
    return to6Bits(input.uint8());
  };

  const to6Bits = (base64Byte: number): number /* [0, 0x3f] <=> 6bits */ => {
    const byte: number = ALPHABET[base64Byte];

    if (byte === BASE64_REVERSE_INVALID) {
      throw new Error(
        `Found invalid base64 char ${JSON.stringify(String.fromCharCode(base64Byte))} (0x${base64Byte.toString(16).padStart(2, '0')}).`,
      );
    }

    return byte;
  };

  for (let i: number = 0; i < inputLastSafeIndex; i += 4) {
    const triplet: number =
      (read6Bits() << 18) | (read6Bits() << 12) | (read6Bits() << 6) | read6Bits();

    output.uint8((triplet >> 16) & 0xff);
    output.uint8((triplet >> 8) & 0xff);
    output.uint8(triplet & 0xff);
  }

  if (omitPadding) {
    const inputRemainingLength: number = length - inputLastSafeIndex; // 0, 2, or 3

    if (inputRemainingLength === 2) {
      const doublet: number = (read6Bits() << 6) | read6Bits();

      output.uint8((doublet >> 4) & 0xff);
    } else if (inputRemainingLength === 3) {
      const doublet: number = (read6Bits() << 12) | (read6Bits() << 6) | read6Bits();

      output.uint8((doublet >> 10) & 0xff);
      output.uint8((doublet >> 2) & 0xff);
    }
  } else if (length > 0) {
    const byte0: number = input.uint8();
    const byte1: number = input.uint8();
    const byte2: number = input.uint8();
    const byte3: number = input.uint8();

    if (byte3 === BASE64_PADDING) {
      if (byte2 === BASE64_PADDING) {
        const doublet: number = (to6Bits(byte0) << 6) | to6Bits(byte1);

        output.uint8((doublet >> 4) & 0xff);
      } else {
        const doublet: number = (to6Bits(byte0) << 12) | (to6Bits(byte1) << 6) | to6Bits(byte2);

        output.uint8((doublet >> 10) & 0xff);
        output.uint8((doublet >> 2) & 0xff);
      }
    } else {
      const triplet: number =
        (to6Bits(byte0) << 18) | (to6Bits(byte1) << 12) | (to6Bits(byte2) << 6) | to6Bits(byte3);

      output.uint8((triplet >> 16) & 0xff);
      output.uint8((triplet >> 8) & 0xff);
      output.uint8(triplet & 0xff);
    }
  }

  return output;
}
