import { singleAlphanumericToNumber } from '../../../converters/hex-string/bytes/single-alphanumeric-to-number/single-alphanumeric-to-number.js';
import { isTabOrSpace } from '../is-tab-or-space.js';

export function decodeFromQuotedPrintable(input: Uint8Array): Uint8Array {
  const inputLength: number = input.length;
  const inputLengthMinusOne: number = inputLength - 1;
  const inputLengthMinusTwo: number = inputLength - 2;

  const output: Uint8Array = new Uint8Array(inputLength);
  let outputLength: number = 0;

  for (let i: number = 0; i < inputLength; i++) {
    const byte: number = input[i];

    if (byte === 0x3d /* = */) {
      if (i >= inputLengthMinusTwo) {
        quotedPrintableError('found an equal sign without without two following characters.');
      }

      const a: number = input[i + 1];
      const b: number = input[i + 2];
      i += 2;

      if (a === 0x0d /* \r */) {
        if (b !== 0x0a /* \n */) {
          quotedPrintableError('found a CR sequence without a following LF.');
        } // else "soft line break" -> ignore
      } else {
        output[outputLength++] =
          (singleAlphanumericToNumber(a) << 4) | singleAlphanumericToNumber(b);
      }
    } else if (byte === 0x0d /* \r */) {
      if (i >= inputLengthMinusOne || input[i + 1] !== 0x0a /* \n */) {
        quotedPrintableError('found a CR sequence without a following LF.');
      } // else "meaningful line break"

      i += 1;

      outputLength = removeQuotedPrintableTrailingWhiteSpaces(output, outputLength);

      output[outputLength++] = 0x0d /* \r */;
      output[outputLength++] = 0x0a /* \n */;
    } else {
      output[outputLength++] = byte;
    }
  }

  outputLength = removeQuotedPrintableTrailingWhiteSpaces(output, outputLength);

  return output.subarray(0, outputLength);
}

/*---*/

function quotedPrintableError(message: string): never {
  throw new Error(`Invalid quoted-printable encoding: ${message}`);
}

function removeQuotedPrintableTrailingWhiteSpaces(bytes: Uint8Array, index: number): number {
  // “Therefore, when decoding a `Quoted-Printable` body, any trailing white
  // space on a line must be deleted, as it will necessarily have been added
  // by intermediate transport agents.”
  while (index >= 0 && isTabOrSpace(bytes[index - 1])) {
    index--;
  }

  return index;
}
