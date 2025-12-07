import { type Decoder } from '../../../../../decoder.js';
import { decodeUintXLE } from '../../uint-x.private/decode-uint-x-l-e/decode-uint-x-l-e.js';

export function decodeUint24LE(decoder: Decoder): number {
  return Number(decodeUintXLE(decoder, 3));
  // return decoder.uint16LE() & (decoder.uint8() << 16);
}
