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
    low = value < 0 ? 0xfc : 0x7c;
    high = 0x00;
  } else if (value === 0) {
    low = Object.is(value, -0) ? 0x80 : 0x00;
    high = 0x00;
  } else {
    const float32: Float32Array = new Float32Array([value]);
    const int32: Uint32Array = new Uint32Array(float32.buffer);

    const f32: number = int32[0];
    const sign: number = (f32 >> 31) & 0x1;
    let exponent: number = ((f32 >> 23) & 0xff) - 112;
    let mantissa: number = (f32 & 0x007fffff) >> 13;

    if (exponent < -10) {
      // too small, return zero
      low = 0x00;
      high = 0x00;
    } else if (exponent > 30) {
      low = (sign << 7) | 0x7c | (exponent === 143 ? 0 : 2);
      high = 0x00;
    } else {
      if (exponent <= 0) {
        mantissa = (mantissa | 0x0800) >> (1 - exponent);
        exponent = 0;
      }

      let float16: number = (sign << 15) | ((exponent & 0x1f) << 10) | mantissa;

      low = float16 & 0xff;
      high = (float16 >> 8) & 0xff;
    }
  }

  if (littleEndian) {
    view.setUint8(byteOffset, low);
    view.setUint8(byteOffset + 1, high);
  } else {
    view.setUint8(byteOffset, high);
    view.setUint8(byteOffset + 1, low);
  }
}
