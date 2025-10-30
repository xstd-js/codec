import { type Decoder } from '../../../decoder/decoder.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { singleAlphanumericToNumber } from '../../hex-string/bytes/single-alphanumeric-to-number/single-alphanumeric-to-number.js';
import { quotedPrintableError } from './helpers.private/quoted-printable-error.js';
import { removeQuotedPrintableTrailingWhiteSpaces } from './helpers.private/remove-quoted-printable-trailing-white-spaces.js';

/**
 * Reads `length` chars represented as _quoted-printable_ format from `input`,
 * decodes them into the corresponding bytes, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the chars to read and convert to bytes.
 * @returns {Encoder} The `output` Encoder with the decoded bytes.
 */
export function convertQuotedPrintableStringToBytes<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
): GOutput {
  const end: number = input.consumed + length;

  const remaining = (): number => {
    return end - input.consumed;
  };

  const outputBytes: Uint8Array = new Uint8Array(length);
  let outputLength: number = 0;

  while (remaining() > 0) {
    const byte: number = input.uint8();

    if (byte === 0x3d /* = */) {
      if (remaining() < 2) {
        quotedPrintableError('found an equal sign without without two following characters.');
      }

      const a: number = input.uint8();
      const b: number = input.uint8();

      if (a === 0x0d /* \r */) {
        if (b !== 0x0a /* \n */) {
          quotedPrintableError('found a CR sequence without a following LF.');
        } // else "soft line break" -> ignore
      } else {
        outputBytes[outputLength++] =
          (singleAlphanumericToNumber(a) << 4) | singleAlphanumericToNumber(b);
      }
    } else if (byte === 0x0d /* \r */) {
      if (remaining() < 1 || input.uint8() !== 0x0a /* \n */) {
        quotedPrintableError('found a CR sequence without a following LF.');
      } // else "meaningful line break"

      outputLength = removeQuotedPrintableTrailingWhiteSpaces(outputBytes, outputLength);

      outputBytes[outputLength++] = 0x0d /* \r */;
      outputBytes[outputLength++] = 0x0a /* \n */;
    } else {
      outputBytes[outputLength++] = byte;
    }
  }

  outputLength = removeQuotedPrintableTrailingWhiteSpaces(outputBytes, outputLength);

  output.bytes(outputBytes.subarray(0, outputLength));

  return output;
}
