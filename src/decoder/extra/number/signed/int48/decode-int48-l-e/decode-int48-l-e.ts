import { type Decoder } from '../../../../../decoder.js';
import { decodeIntXLE } from '../../int-x.private/decode-int-x-l-e/decode-int-x-l-e.js';

export function decodeInt48LE(decoder: Decoder): number {
  return Number(decodeIntXLE(decoder, 6));
}
