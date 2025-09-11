import { BASE64_ALPHABET } from './base64-alphabet.js';

export const BASE64_URL_ALPHABET = new Uint8Array([
  ...BASE64_ALPHABET.slice(0, -2),
  // -
  45,
  // _
  95,
]);
