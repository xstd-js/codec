import { type Encoder } from '../../../../../encoder.js';
import { encodeUintXLE } from '../../uint-x.private/encode-uint-x-l-e/encode-uint-x-l-e.js';

export function encodeUint24LE(encoder: Encoder, input: number): void {
  encodeUintXLE(encoder, input, 3);

  // encoder.uint8(input & 0xff);
  // encoder.uint8((input >> 8) & 0xff);
  // encoder.uint8((input >> 16) & 0xff);

  // encoder.uint16LE(input & 0xffff).uint8((input >> 16) & 0xff);
}
