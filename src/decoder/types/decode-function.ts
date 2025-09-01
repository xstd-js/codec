import { type Decoder } from '../decoder.js';

export interface DecodeFunction<GReturn> {
  (decoder: Decoder): GReturn;
}
