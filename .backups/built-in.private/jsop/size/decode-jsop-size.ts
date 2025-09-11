import { type Decoder } from '../../../../src/decoder/decoder.js';

export function decodeJsopSize(dencoder: Decoder): number {
  let size: number = 0;
  let byte: number;
  let offset: number = 0;
  do {
    byte = dencoder.uint8();
    size |= (byte & 0b01111111) << offset;
    offset += 7;
  } while (byte & 0b10000000);
  return size;
}
