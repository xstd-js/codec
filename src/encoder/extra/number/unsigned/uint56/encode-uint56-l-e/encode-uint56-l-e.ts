import { type Encoder } from '../../../../../encoder.js';
import { encodeUintXLE } from '../../uint-x.private/encode-uint-x-l-e/encode-uint-x-l-e.js';

export function encodeUint56LE(encoder: Encoder, input: bigint | number): void {
  encodeUintXLE(encoder, input, 7);
}
