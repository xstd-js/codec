import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { numberToSingleAlphanumeric } from './number-to-single-alphanumeric/number-to-single-alphanumeric.js';

export interface ConvertBytesToHexStringOptions {
  readonly uppercase?: boolean;
}

/**
 * Reads `length` bytes from `decoder`,
 * encodes them in _hex_ format, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the bytes to read and convert to hex chars.
 * @param {ConvertBytesToHexStringOptions} [options]
 * @returns {Encoder} The `output` Encoder with the encoded bytes.
 */
export function convertBytesToHexString<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
  { uppercase = false }: ConvertBytesToHexStringOptions = {},
): GOutput {
  for (let i: number = 0; i < length; i++) {
    const byte: number = input.uint8();

    output.uint8(numberToSingleAlphanumeric(byte >> 4, uppercase));
    output.uint8(numberToSingleAlphanumeric(byte & 0x0f, uppercase));
  }

  return output;
}
