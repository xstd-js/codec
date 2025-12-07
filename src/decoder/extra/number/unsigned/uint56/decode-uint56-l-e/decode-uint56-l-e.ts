import { type Decoder } from '../../../../../decoder.js';
import { decodeUintXLE } from '../../uint-x.private/decode-uint-x-l-e/decode-uint-x-l-e.js';

export function decodeUint56LE(decoder: Decoder): bigint {
  return decodeUintXLE(decoder, 7);
  // return BigInt(decoder.uint32LE()) & (BigInt(decodeUint24LE(decoder)) << 32n);
}
