export function get_float_16(
  view: DataView,
  byteOffset: number,
  littleEndian: boolean = false,
): number {
  let low: number, high: number;

  if (littleEndian) {
    low = view.getUint8(byteOffset);
    high = view.getUint8(byteOffset + 1);
  } else {
    high = view.getUint8(byteOffset);
    low = view.getUint8(byteOffset + 1);
  }

  const float16: number = (high << 8) | low;
  const sign: number = (float16 >> 15) & 0x1;
  const exponent: number = (float16 >> 10) & 0x1f;
  const mantissa: number = float16 & 0x03ff;

  if (exponent === 0x1f) {
    if (mantissa === 0) {
      return sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    } else {
      return Number.NaN;
    }
  } else if (exponent === 0) {
    if (mantissa === 0) {
      return sign ? -0 : 0;
    } else {
      return (sign ? -1 : 1) * (mantissa / 1024) * Math.pow(2, -14);
    }
  } else {
    return (sign ? -1 : 1) * (1 + mantissa / 1024) * Math.pow(2, exponent - 15);
  }
}
