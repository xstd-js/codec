export function isSafeQuotedPrintableChar(byte: number): boolean {
  return 0x21 /* 33*/ <= byte && byte <= 0x7e /* 126 */ && byte !== 0x3d /* = */;
}
