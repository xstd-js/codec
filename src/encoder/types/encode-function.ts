import { type Encoder } from '../encoder.js';

/**
 * A function encoding a `GValue` into an `Encoder`.
 */
export interface EncodeFunction<GValue> {
  (encoder: Encoder, value: GValue): void;
}
