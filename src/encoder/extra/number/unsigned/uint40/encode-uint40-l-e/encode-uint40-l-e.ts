import { type Encoder } from '../../../../../encoder.js';
import { encodeUintXLE } from '../../uint-x.private/encode-uint-x-l-e/encode-uint-x-l-e.js';

export function encodeUint40LE(encoder: Encoder, input: number): void {
  encodeUintXLE(encoder, input, 5);
}
