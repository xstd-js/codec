import { type Encoder } from '../../../../encoder/encoder.js';
import { encodeQuotedPrintableLineBreak } from './encode-quoted-printable-line-break.js';

export function encodeQuotedPrintableSoftLineBreak(encoder: Encoder): void {
  encoder.uint8(0x3d /* = */);
  encodeQuotedPrintableLineBreak(encoder);
}
