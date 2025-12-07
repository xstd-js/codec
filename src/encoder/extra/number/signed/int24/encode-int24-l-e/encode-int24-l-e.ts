import { type Encoder } from '../../../../../encoder.js';
import { encodeIntXLE } from '../../int-x.private/encode-int-x-l-e/encode-int-x-l-e.js';

export function encodeInt24LE(encoder: Encoder, input: number): void {
  encodeIntXLE(encoder, input, 3);
  // encodeUint24LE(encoder, input < 0 ? input + 0x100_0000 : input);
}
