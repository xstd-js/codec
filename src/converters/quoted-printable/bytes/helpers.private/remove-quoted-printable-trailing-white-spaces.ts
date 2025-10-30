import { isTabOrSpace } from '../../helpers.private/is-tab-or-space.js';

export function removeQuotedPrintableTrailingWhiteSpaces(bytes: Uint8Array, index: number): number {
  // “Therefore, when decoding a `Quoted-Printable` body, any trailing white
  // space on a line must be deleted, as it will necessarily have been added
  // by intermediate transport agents.”
  while (index >= 0 && isTabOrSpace(bytes[index - 1])) {
    index--;
  }

  return index;
}
