import { type Decoder } from '../../../../decoder/decoder.js';
import { type Encoder } from '../../../../encoder/encoder.js';
import { isSafeQuotedPrintableChar } from '../../../quoted-printable/helpers.private/is-safe-quoted-printable-char.js';
import { isTabOrSpace } from '../../../quoted-printable/helpers.private/is-tab-or-space.js';
import { numberToSingleAlphanumeric } from '../../hex-string/number-to-single-alphanumeric/number-to-single-alphanumeric.js';
import { encodeQuotedPrintableLineBreak } from '../helpers.private/encode-quoted-printable-line-break.js';
import { encodeQuotedPrintableSoftLineBreak } from '../helpers.private/encode-quoted-printable-soft-line-break.js';
import { QUOTED_PRINTABLE_MAX_LINE_LENGTH } from '../helpers.private/quoted-printable-max-line-length.constant.js';

/**
 * Reads `length` bytes from `input`,
 * encodes them in _quoted-printable_ with a "text" format, and writes the result into `output`.`
 *
 * @param {Decoder} input The `Decoder` to read from.
 * @param {Encoder} output The `Encoder` to write into.
 * @param {number} [length] The length of the bytes to read and convert to quoted-printable chars.
 * @returns {Encoder} The `output` Encoder with the encoded bytes.
 */
export function convertBytesToTextQuotedPrintableString<GOutput extends Encoder>(
  input: Decoder,
  output: GOutput,
  length: number = input.remaining,
): GOutput {
  const inputBytes: Uint8Array = input.bytes(length);
  const inputLength: number = inputBytes.length;
  const inputLengthMinusOne: number = inputLength - 1;
  const inputLengthMinusTwo: number = inputLength - 2;

  let currentLineLength: number = 0;

  const sequence: Uint8Array = new Uint8Array(3);
  let sequenceLength: number = 0;

  for (let i: number = 0; i < inputLength; i++) {
    const byte: number = inputBytes[i];

    if (byte === 0x0d /* \r */ && i < inputLengthMinusOne && inputBytes[i + 1] === 0x0a /* \n */) {
      // -> `byte` and the next one forms a "meaningful line break"
      encodeQuotedPrintableLineBreak(output);
      i += 1;
      currentLineLength = 0;
    } else {
      // INFO possible alternative
      // isSafeQuotedPrintableChar(byte) ||
      // (isTabOrSpace(byte) &&
      //   i !== lengthMinusOne /* is not last */ &&
      //   /* not followed by a line break */
      //   !(
      //     i < lengthMinusTwo &&
      //     bytes[i + 1] === 0x0d /* \r */ &&
      //     bytes[i + 2] === 0x0a /* \n */
      //   ) &&
      //   /* not followed by tab or space */
      //   (!isTabOrSpace(bytes[i + 1]) ||
      //     /* OR followed by tab or space AND */
      //     currentLineLength < maxLineLength - 1))

      if (
        isSafeQuotedPrintableChar(byte) ||
        (isTabOrSpace(byte) &&
          /* not followed by a line break */
          !(
            (
              i < inputLengthMinusTwo &&
              inputBytes[i + 1] === 0x0d /* \r */ &&
              inputBytes[i + 2] === 0x0a
            ) /* \n */
          ))
      ) {
        sequence[0] = byte;
        sequenceLength = 1;
      } else {
        // -> `byte` is NOT safe
        // -> `byte` must be encoded
        sequence[0] = 0x3d /* = */;
        sequence[1] = numberToSingleAlphanumeric(byte >> 4, true);
        sequence[2] = numberToSingleAlphanumeric(byte & 0x0f, true);
        sequenceLength = 3;
      }

      // WRITE SEQUENCE

      // test if `sequence` can be written without exceeding `maxLineLength`:
      // - if it's the last sequence, at least `sequenceLength` chars must be available
      // - if it's not the last sequence, at least `sequenceLength + 1` chars must be available (to include a potential "soft line break": `=`)

      // first we compute the size of the "next" line break
      const lineBreakSize: number =
        /* is last */
        i === inputLengthMinusOne ||
        /* is followed by a "meaningful line break"*/
        (i < inputLengthMinusTwo &&
          inputBytes[i + 1] === 0x0d /* \r */ &&
          inputBytes[i + 2] === 0x0a) /* \n */
          ? 0 /* if this is the last sequence, or it's followed by a "meaningful line break", then the "next" line break has a size of 0 */
          : 1;

      if (
        /* test if writing this sequence AND a "line break" will exceed `maxLineLength` */
        currentLineLength + sequenceLength + lineBreakSize <=
        QUOTED_PRINTABLE_MAX_LINE_LENGTH
      ) {
        // -> is safely writable
        output.bytes(sequence.subarray(0, sequenceLength));
        currentLineLength += sequenceLength;
      } else {
        // -> writing this sequence AND a "line break" will exceed `maxLineLength`
        // thus, we have to end the current line and continue on a new one
        // for this, we introduce a "soft line break" and then write the sequence on the new line
        encodeQuotedPrintableSoftLineBreak(output);
        output.bytes(sequence.subarray(0, sequenceLength));
        currentLineLength = sequenceLength;
      }
    }
  }

  return output;
}
