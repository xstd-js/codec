import type { Encoder } from '../../../../../src/encoder/encoder.js';

export function encodeJsopBigSize(encoder: Encoder, size: bigint): void {
  let byte: number;
  do {
    byte = Number(size & 0b01111111n);
    size >>= 7n;
    byte |= ((size !== 0n) as any) << 7;
    encoder.uint8(byte);
  } while (size !== 0n);
}
