import { type Encoder } from '../../../../../encoder.js';
import { encodeIntXLE } from '../../int-x.private/encode-int-x-l-e/encode-int-x-l-e.js';

export function encodeInt40LE(encoder: Encoder, input: number): void {
  encodeIntXLE(encoder, input, 5);
}
