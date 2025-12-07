import { type Decoder } from '../../../../../decoder.js';
import { decodeUintXLE } from '../../uint-x.private/decode-uint-x-l-e/decode-uint-x-l-e.js';

export function decodeUint40LE(decoder: Decoder): number {
  return Number(decodeUintXLE(decoder, 5));
  // return Number(BigInt(decoder.uint32LE()) & (BigInt(decoder.uint8()) << 32n));
}
