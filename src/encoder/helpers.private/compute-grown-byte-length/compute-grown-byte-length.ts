export function computeGrownByteLength(requiredByteLength: number, maxByteLength: number): number {
  return Math.min(
    maxByteLength,
    // round to the upper limit, with a "half-byte" of margin
    2 ** Math.ceil(Math.log2(requiredByteLength) + 0.5),
  );
}
