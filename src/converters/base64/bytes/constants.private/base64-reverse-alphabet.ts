import { BASE64_ALPHABET } from '../../../bytes/base64/constants.private/base64-alphabet.js';
import { BASE64_REVERSE_INVALID } from './base64-reverse-invalid.js';

export const BASE64_REVERSE_ALPHABET = new Uint8Array(256);

BASE64_REVERSE_ALPHABET.fill(BASE64_REVERSE_INVALID); // INVALID

BASE64_ALPHABET.forEach((_char: number, index: number): void => {
  BASE64_REVERSE_ALPHABET[_char] = index;
});
