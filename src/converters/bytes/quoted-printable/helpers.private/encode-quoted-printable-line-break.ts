import { type Encoder } from '../../../../encoder/encoder.js';

export function encodeQuotedPrintableLineBreak(encoder: Encoder): void {
  encoder.uint8(0x0d /* \r */);
  encoder.uint8(0x0a /* \n */);
}
