import { type Decoder } from '../../../../../decoder.js';
import { decodeIntXLE } from '../../int-x.private/decode-int-x-l-e/decode-int-x-l-e.js';

export function decodeInt40LE(decoder: Decoder): number {
  return Number(decodeIntXLE(decoder, 5));
}
