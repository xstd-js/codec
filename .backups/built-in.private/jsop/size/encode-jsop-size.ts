import { type Encoder } from '../../../../src/encoder/encoder.js';

export function encodeJsopSize(encoder: Encoder, size: number): void {
  let byte: number;
  do {
    byte = size & 0b01111111;
    size >>= 7;
    byte |= ((size !== 0) as any) << 7;
    encoder.uint8(byte);
  } while (size !== 0);
}
