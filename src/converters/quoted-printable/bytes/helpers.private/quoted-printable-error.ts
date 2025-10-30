export function quotedPrintableError(message: string): never {
  throw new Error(`Invalid quoted-printable encoding: ${message}`);
}
