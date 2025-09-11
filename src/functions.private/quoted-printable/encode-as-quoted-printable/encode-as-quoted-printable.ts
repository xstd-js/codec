import { numberToSingleAlphanumeric } from '../../../converters/bytes/hex-string/number-to-single-alphanumeric/number-to-single-alphanumeric.js';
import { type Encoder } from '../../../encoder/encoder.js';
import { isSafeQuotedPrintableChar } from '../is-safe-quoted-printable-char.js';
import { isTabOrSpace } from '../is-tab-or-space.js';

/* TEXT */

export function encodeAsTextQuotedPrintable(encoder: Encoder, input: Uint8Array): void {
  const inputLength: number = input.length;
  const inputLengthMinusOne: number = inputLength - 1;
  const inputLengthMinusTwo: number = inputLength - 2;

  let currentLineLength: number = 0;

  const sequence: Uint8Array = new Uint8Array(3);
  let sequenceLength: number = 0;

  for (let i: number = 0; i < inputLength; i++) {
    const byte: number = input[i];

    if (byte === 0x0d /* \r */ && i < inputLengthMinusOne && input[i + 1] === 0x0a /* \n */) {
      // -> `byte` and the next one forms a "meaningful line break"
      encodeQuotedPrintableLineBreak(encoder);
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
              input[i + 1] === 0x0d /* \r */ &&
              input[i + 2] === 0x0a
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
          input[i + 1] === 0x0d /* \r */ &&
          input[i + 2] === 0x0a) /* \n */
          ? 0 /* if this is the last sequence, or it's followed by a "meaningful line break", then the "next" line break has a size of 0 */
          : 1;

      if (
        /* test if writing this sequence AND a "line break" will exceed `maxLineLength` */
        currentLineLength + sequenceLength + lineBreakSize <=
        QUOTED_PRINTABLE_MAX_LINE_LENGTH
      ) {
        // -> is safely writable
        encoder.bytes(sequence.subarray(0, sequenceLength));
        currentLineLength += sequenceLength;
      } else {
        // -> writing this sequence AND a "line break" will exceed `maxLineLength`
        // thus, we have to end the current line and continue on a new one
        // for this, we introduce a "soft line break" and then write the sequence on the new line
        encodeQuotedPrintableSoftLineBreak(encoder);
        encoder.bytes(sequence.subarray(0, sequenceLength));
        currentLineLength = sequenceLength;
      }
    }
  }
}

/* BINARY */

export function encodeAsBinaryQuotedPrintable(encoder: Encoder, input: Uint8Array): void {
  const inputLength: number = input.length;
  let currentLineLength: number = 0;

  for (let i: number = 0; i < inputLength; i++) {
    const byte: number = input[i];

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
      encodeQuotedPrintableSoftLineBreak(encoder);
      currentLineLength = 0;
    }

    encoder.uint8(0x3d /* = */);
    encoder.uint8(numberToSingleAlphanumeric(byte >> 4, true));
    encoder.uint8(numberToSingleAlphanumeric(byte & 0x0f, true));

    currentLineLength += 3;
  }
}

/*---*/

const QUOTED_PRINTABLE_MAX_LINE_LENGTH: number = 76;

const QUOTED_PRINTABLE_MAX_LINE_LENGTH_MINUS_FOUR: number = QUOTED_PRINTABLE_MAX_LINE_LENGTH - 4;

/*---*/

function encodeQuotedPrintableLineBreak(encoder: Encoder): void {
  encoder.uint8(0x0d /* \r */);
  encoder.uint8(0x0a /* \n */);
}

function encodeQuotedPrintableSoftLineBreak(encoder: Encoder): void {
  encoder.uint8(0x3d /* = */);
  encodeQuotedPrintableLineBreak(encoder);
}
