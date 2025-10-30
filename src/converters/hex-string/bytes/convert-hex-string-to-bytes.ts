import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import {
  type AlphanumericMustBeUpperCase,
  singleAlphanumericToNumber,
} from './single-alphanumeric-to-number/single-alphanumeric-to-number.js';

export interface ConvertHexStringToBytesOptions {
  readonly uppercase?: AlphanumericMustBeUpperCase;
}

/**
 * Reads `length` chars represented as _hex_ format from `input`,
 * decodes them into the corresponding bytes, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the chars to read and convert to bytes.
 * @param {ConvertHexStringToBytesOptions} [options]
 * @returns {Encoder} The `output` Encoder with the decoded bytes.
 */
export function convertHexStringToBytes<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
  { uppercase = 'either' }: ConvertHexStringToBytesOptions = {},
): GOutput {
  if (length % 2 !== 0) {
    throw new Error('Hex string must have an even number of characters.');
  }

  for (let i: number = 0; i < length; i += 2) {
    output.uint8(
      (singleAlphanumericToNumber(input.uint8(), uppercase) << 4) |
        singleAlphanumericToNumber(input.uint8(), uppercase),
    );
  }

  return output;
}
