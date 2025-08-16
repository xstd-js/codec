import { type Encoder } from '../encoder.js';

export interface EncodeFunction<GValue> {
  (encoder: Encoder, value: GValue): void;
}
