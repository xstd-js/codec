export function set_float_16(
  view: DataView,
  byteOffset: number,
  value: number,
  littleEndian: boolean = false,
): void {
  let low: number, high: number;

  if (Object.is(value, NaN)) {
    low = 0x01;
    high = 0x7e;
  } else if (!Number.isFinite(value)) {
    // -> ±Infinity (bits 0x7c00 / 0xfc00)
    low = 0x00;
    high = value < 0 ? 0xfc : 0x7c;
  } else if (value === 0) {
    low = Object.is(value, -0) ? 0x80 : 0x00;
    high = 0x00;
  } else {
    const float32: Float32Array = new Float32Array([value]);
    const int32: Uint32Array = new Uint32Array(float32.buffer);

    const f32: number = int32[0];
    const sign: number = (f32 >> 31) & 0x1;
    let exponent: number = ((f32 >> 23) & 0xff) - 112;
    const mantissa32: number = f32 & 0x007fffff;
    let float16: number;

    if (exponent < -10) {
      // too small: rounds to zero (a tie at half the smallest subnormal rounds to even, i.e. zero)
      float16 = sign << 15;
    } else if (exponent > 30) {
      // -> overflow: ±Infinity (bits 0x7c00 / 0xfc00)
      float16 = (sign << 15) | 0x7c00;
    } else if (exponent <= 0) {
      // -> subnormal: round-to-nearest-even the implicit-bit mantissa on its dropped bits
      const shift: number = 14 - exponent; /* [14, 24] */
      const combined: number = 0x800000 /* implicit bit */ | mantissa32;
      const half: number = 1 << (shift - 1);

      let mantissa: number = combined >> shift;
      const dropped: number = combined & ((1 << shift) - 1);

      if (dropped > half || (dropped === half && (mantissa & 1) === 1)) {
        mantissa++;
      }

      if (mantissa > 0x3ff) {
        // -> the rounding carried into the smallest normal: 2^-14 (bits 0x0400)
        float16 = (sign << 15) | 0x400;
      } else {
        float16 = (sign << 15) | mantissa;
      }
    } else {
      // -> normal: round-to-nearest-even the mantissa on its 13 dropped bits
      let mantissa: number = mantissa32 >> 13;
      const dropped: number = mantissa32 & 0x1fff;

      if (dropped > 0x1000 || (dropped === 0x1000 && (mantissa & 1) === 1)) {
        mantissa++;
      }

      if (mantissa > 0x3ff) {
        // -> the rounding carried into the exponent
        mantissa = 0;
        exponent++;
      }

      if (exponent > 30) {
        // -> rounded into overflow: ±Infinity (bits 0x7c00 / 0xfc00)
        float16 = (sign << 15) | 0x7c00;
      } else {
        float16 = (sign << 15) | ((exponent & 0x1f) << 10) | mantissa;
      }
    }

    low = float16 & 0xff;
    high = (float16 >> 8) & 0xff;
  }

  if (littleEndian) {
    view.setUint8(byteOffset, low);
    view.setUint8(byteOffset + 1, high);
  } else {
    view.setUint8(byteOffset, high);
    view.setUint8(byteOffset + 1, low);
  }
}
