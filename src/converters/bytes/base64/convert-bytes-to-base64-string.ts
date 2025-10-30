import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { BASE64_ALPHABET } from './constants.private/base64-alphabet.js';
import { BASE64_PADDING } from './constants.private/base64-padding.js';
import { BASE64_URL_ALPHABET } from './constants.private/base64-url-alphabet.js';

export interface ConvertBytesToBase64StringOptions {
  readonly alphabet?: 'base64' | 'base64url';
  readonly omitPadding?: boolean;
}

/**
 * Reads `length` bytes from `input`,
 * encodes them in _base64_ format, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the bytes to read and convert to base64 chars.
 * @param {ConvertBytesToBase64StringOptions} [options]
 * @returns {Encoder} The `output` Encoder with the encoded bytes.
 */
export function convertBytesToBase64String<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
  { alphabet = 'base64', omitPadding = false }: ConvertBytesToBase64StringOptions = {},
): GOutput {
  // https://datatracker.ietf.org/doc/html/rfc4648

  const ALPHABET: Uint8Array = alphabet === 'base64' ? BASE64_ALPHABET : BASE64_URL_ALPHABET;

  const inputLengthDiv3: number = length / 3;
  const inputLengthDiv3Floored: number = Math.floor(inputLengthDiv3);
  const inputLastSafeIndex: number = inputLengthDiv3Floored * 3;
  const inputRemainingLength: number = length - inputLastSafeIndex; // bytes.length % 3 <=> 0, 1, or 2

  for (let i: number = 0; i < inputLastSafeIndex; i += 3) {
    const triplet: number = (input.uint8() << 16) | (input.uint8() << 8) | input.uint8();

    output.uint8(ALPHABET[(triplet >> 18) & 0x3f]);
    output.uint8(ALPHABET[(triplet >> 12) & 0x3f]);
    output.uint8(ALPHABET[(triplet >> 6) & 0x3f]);
    output.uint8(ALPHABET[triplet & 0x3f]);
  }

  if (inputRemainingLength === 1) {
    const byte: number = input.uint8();

    // NOTE: if byte <= 0b00111111 AND omitPadding === true, should we add only 1 character ?.

    output.uint8(ALPHABET[(byte >> 2) & 0x3f]);
    output.uint8(ALPHABET[(byte << 4) & 0x3f]);

    if (!omitPadding) {
      output.uint8(BASE64_PADDING);
      output.uint8(BASE64_PADDING);
    }
  } else if (inputRemainingLength === 2) {
    const doublet: number = (input.uint8() << 8) | input.uint8();

    output.uint8(ALPHABET[(doublet >> 10) & 0x3f]);
    output.uint8(ALPHABET[(doublet >> 4) & 0x3f]);
    output.uint8(ALPHABET[(doublet << 2) & 0x3f]);

    if (!omitPadding) {
      output.uint8(BASE64_PADDING);
    }
  }

  return output;
}
