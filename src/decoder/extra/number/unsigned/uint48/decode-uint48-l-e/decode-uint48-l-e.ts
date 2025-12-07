import { type Decoder } from '../../../../../decoder.js';
import { decodeUintXLE } from '../../uint-x.private/decode-uint-x-l-e/decode-uint-x-l-e.js';

export function decodeUint48LE(decoder: Decoder): number {
  return Number(decodeUintXLE(decoder, 6));
  // return Number(BigInt(decoder.uint32LE()) & (BigInt(decoder.uint16LE()) << 32n));
}
