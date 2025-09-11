/**
 * Converts a number (0-16) into its alphanumeric counterpart (0-9a-fA-F).
 */
export function numberToSingleAlphanumeric(
  input: number /* [0, 0x0f] */,
  uppercase: boolean,
): number /* byte */ {
  if (input < 0x0a) {
    return input + 0x30;
  } else if (input < 0x10) {
    return input + (uppercase ? 0x37 : 0x57);
  } else {
    throw new RangeError(`char must be in range [0, 0x0f]`);
  }
}
