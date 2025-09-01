export function singleAlphanumericToNumber(
  byte: number,
  uppercase?: boolean,
): number /* [0, 0x0f] */ {
  if (0x30 /* 0 */ <= byte && byte <= 0x39 /* 9 */) {
    return byte - 0x30;
  } else if (0x41 /* A */ <= byte && byte <= 0x46 /* F */) {
    if (uppercase === false) {
      throw new Error(`Expected lowercase alpha char: ${byte.toString(16).padStart(2, '0')}`);
    }
    return byte - 0x37 /* - 0x41 + 0x0a */;
  } else if (0x61 /* a */ <= byte && byte <= 0x66 /* f */) {
    if (uppercase === true) {
      throw new Error(`Expected uppercase alpha char: ${byte.toString(16).padStart(2, '0')}`);
    }
    return byte - 0x57 /* - 0x61 + 0x0a*/;
  } else {
    throw new Error(`Not an alpha character: ${byte.toString(16).padStart(2, '0')}`);
  }
}
