export function isTabOrSpace(byte: number): boolean {
  return byte === 0x09 /* \t */ || byte === 0x20 /* SPACE */;
}
