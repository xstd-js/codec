/**
 * Computes the byte length to grow to, so that `requiredByteLength` bytes fit.
 *
 * Rounds up to the next power of two with a half-byte of margin
 * (i.e. a ~1.41x growth factor), capped to `maxByteLength`.
 */
export function computeGrownByteLength(requiredByteLength: number, maxByteLength: number): number {
  return Math.min(
    maxByteLength,
    // round to the upper limit, with a "half-byte" of margin
    2 ** Math.ceil(Math.log2(requiredByteLength) + 0.5),
  );
}
