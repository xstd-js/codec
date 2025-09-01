import { type Decoder } from '../../../../decoder/decoder.js';

export function decodeJsopBigSize(dencoder: Decoder): bigint {
  let size: bigint = 0n;
  let byte: number;
  let offset: bigint = 0n;
  do {
    byte = dencoder.uint8();
    size |= BigInt(byte & 0b01111111) << offset;
    offset += 7n;
  } while (byte & 0b10000000);
  return size;
}
