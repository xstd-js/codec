import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { convertBytesToBinaryQuotedPrintableString } from './convert-bytes-to-binary-quoted-printable-string/convert-bytes-to-binary-quoted-printable-string.js';
import { convertBytesToTextQuotedPrintableString } from './convert-bytes-to-text-quoted-printable-string/convert-bytes-to-text-quoted-printable-string.js';

export interface ConvertBytesToQuotedPrintableStringOptions {
  readonly mode?: 'text' | 'binary';
}

/**
 * Reads `length` bytes from `input`,
 * encodes them in _quoted-printable_ format, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the bytes to read and convert to base64 chars.
 * @param {ConvertBytesToBase64StringOptions} [options]
 * @returns {Encoder} The `output` Encoder with the encoded bytes.
 */
export function convertBytesToQuotedPrintableString<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
  { mode = 'text' }: ConvertBytesToQuotedPrintableStringOptions = {},
): GOutput {
  switch (mode) {
    case 'text':
      return convertBytesToTextQuotedPrintableString(input, output, length);
    case 'binary':
      return convertBytesToBinaryQuotedPrintableString(input, output, length);
    default:
      throw new Error(`Invalid mode: ${mode}.`);
  }
}
