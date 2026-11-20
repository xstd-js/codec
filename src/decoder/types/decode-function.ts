import { type Decoder } from '../decoder.js';

/**
 * A function decoding a `GValue` from a `Decoder`.
 */
export interface DecodeFunction<GReturn> {
  (decoder: Decoder): GReturn;
}
