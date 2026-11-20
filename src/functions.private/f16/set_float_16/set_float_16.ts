export function set_float_16(
  view: DataView,
  byteOffset: number,
  value: number,
  littleEndian: boolean = false,
): void {
  // NOTE: the conversion reads the f64 bits and rounds them DIRECTLY to f16
  // (single rounding): going through f32 would double-round values sitting
  // within half an f32 ULP of an f16 rounding boundary.

  const float64: Float64Array = new Float64Array([value]);
  const int64: BigUint64Array = new BigUint64Array(float64.buffer);

  const f64: bigint = int64[0];
  const sign: number = Number(f64 >> 63n);
  const exponent64: number = Number((f64 >> 52n) & 0x7ffn);
  const mantissa64: bigint = f64 & 0xfffffffffffffn;
  let float16: number;

  if (exponent64 === 0x7ff) {
    if (mantissa64 === 0n) {
      // -> ±Infinity (bits 0x7c00 / 0xfc00)
      float16 = (sign << 15) | 0x7c00;
    } else {
      // -> canonical quiet NaN, sign preserved (bits 0x7e00 / 0xfe00)
      float16 = (sign << 15) | 0x7e00;
    }
  } else if (exponent64 === 0) {
    // -> f64 zero or subnormal: rounds to (signed) zero
    float16 = sign << 15;
  } else {
    // finite non-zero: value = combined * 2^(exponent - 52) with the implicit bit
    let exponent: number = exponent64 - 1023;
    const combined: bigint = (1n << 52n) | mantissa64;

    if (exponent >= -14) {
      // -> normal (or overflow): round-to-nearest-even on the 42 dropped bits
      let mantissa: number = Number(combined >> 42n); /* 11 bits: implicit + 10 */
      const dropped: bigint = combined & ((1n << 42n) - 1n);
      const half: bigint = 1n << 41n;

      if (dropped > half || (dropped === half && (mantissa & 1) === 1)) {
        mantissa++;
      }

      if (mantissa > 0x7ff) {
        // -> the rounding carried into the exponent
        mantissa = 0x400;
        exponent++;
      }

      const exponent16: number = exponent + 15;

      if (exponent16 > 30) {
        // -> rounded into overflow: ±Infinity (bits 0x7c00 / 0xfc00)
        float16 = (sign << 15) | 0x7c00;
      } else {
        float16 = (sign << 15) | (exponent16 << 10) | (mantissa & 0x3ff);
      }
    } else {
      // -> subnormal (or zero): round-to-nearest-even on the (28 - exponent) dropped bits
      const shift: number = 28 - exponent; /* >= 43 */
      const half: bigint = 1n << BigInt(shift - 1);

      let mantissa: number = Number(combined >> BigInt(shift));
      const dropped: bigint = combined & ((1n << BigInt(shift)) - 1n);

      if (dropped > half || (dropped === half && (mantissa & 1) === 1)) {
        mantissa++;
      }

      if (mantissa > 0x3ff) {
        // -> the rounding carried into the smallest normal: 2^-14 (bits 0x0400)
        float16 = (sign << 15) | 0x400;
      } else {
        float16 = (sign << 15) | mantissa;
      }
    }
  }

  const low: number = float16 & 0xff;
  const high: number = (float16 >> 8) & 0xff;

  if (littleEndian) {
    view.setUint8(byteOffset, low);
    view.setUint8(byteOffset + 1, high);
  } else {
    view.setUint8(byteOffset, high);
    view.setUint8(byteOffset + 1, low);
  }
}
