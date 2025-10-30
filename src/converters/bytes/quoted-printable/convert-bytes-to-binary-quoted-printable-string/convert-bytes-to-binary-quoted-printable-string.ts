import { type Decoder } from '../../../../decoder/decoder.js';
import { type Encoder } from '../../../../encoder/encoder.js';
import { numberToSingleAlphanumeric } from '../../hex-string/number-to-single-alphanumeric/number-to-single-alphanumeric.js';
import { encodeQuotedPrintableSoftLineBreak } from '../helpers.private/encode-quoted-printable-soft-line-break.js';
import { QUOTED_PRINTABLE_MAX_LINE_LENGTH_MINUS_FOUR } from '../helpers.private/quoted-printable-max-line-length-minus-four.constant.js';

/**
 * Reads `length` bytes from `input`,
 * encodes them in _quoted-printable_ with a "binary" format, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the bytes to read and convert to quoted-printable chars.
 * @returns {Encoder} The `output` Encoder with the encoded bytes.
 */
export function convertBytesToBinaryQuotedPrintableString<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
): GOutput {
  let currentLineLength: number = 0;

  for (let i: number = 0; i < length; i++) {
    const byte: number = input.uint8();

    if (
      /* test if writing this sequence AND a "soft line break" will exceed `maxLineLength` */
      // currentLineLength + (i === lengthMinusOne /* is last */ ? 3 : 4) >
      // maxLineLength
      /* => optimized version => */
      currentLineLength > QUOTED_PRINTABLE_MAX_LINE_LENGTH_MINUS_FOUR
    ) {
      // -> writing this sequence AND a "soft line break" will exceed `maxLineLength`
      // thus, we have to end the current line and continue on a new one
      // for this, we introduce a "soft line break"
      encodeQuotedPrintableSoftLineBreak(output);
      currentLineLength = 0;
    }

    output.uint8(0x3d /* = */);
    output.uint8(numberToSingleAlphanumeric(byte >> 4, true));
    output.uint8(numberToSingleAlphanumeric(byte & 0x0f, true));

    currentLineLength += 3;
  }

  return output;
}
