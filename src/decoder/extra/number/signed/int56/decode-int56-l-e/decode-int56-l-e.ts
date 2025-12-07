import { type Decoder } from '../../../../../decoder.js';
import { decodeIntXLE } from '../../int-x.private/decode-int-x-l-e/decode-int-x-l-e.js';

export function decodeInt56LE(decoder: Decoder): bigint {
  return decodeIntXLE(decoder, 7);
}
