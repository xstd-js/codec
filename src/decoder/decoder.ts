import { singleAlphanumericToNumber } from '../functions.private/alphanumeric/single-alphanumeric-to-number.js';
import { get_float_16 } from '../functions.private/f16/get_float_16.js';
import { isTabOrSpace } from '../functions.private/quoted-printable/is-tab-or-space.js';
import { type DecodeFunction } from './types/decode-function.js';
import {
  type DecoderStringHexOptions,
  type DecoderStringOptions,
  type DecoderStringQuotedPrintableOptions,
} from './types/methods/string/decoder-string-options.js';

/**
 * Used to _decode_ an `Uint8Array` into various kind of data.
 *
 * @example
 *
 * Decodes a _binary_ string:
 *
 * ```ts
 * const str = Decoder.decode(new Uint8Array([3, 0, 97, 98, 99]), (decoder: Decoder) => {
 *   const length: number = decoder.int16LE(); // decodes the string's length
 *   return decoder.string(length, { encoding: 'binary' }); // decodes the string as binary
 * });
 *
 * // str => 'abc'
 * ```
 */
export class Decoder {
  /**
   * Creates a new `Decoder` from some `bytes`, and immediately calls the `decode` function with this Decoder as argument.
   *
   * Then if the `Decoder` is `done`, it returns the returned value of `decode(...)`, else an `Error` is thrown.
   */
  static decode<GReturn>(bytes: Uint8Array, decode: DecodeFunction<GReturn>): GReturn {
    const decoder: Decoder = new Decoder(bytes);
    const result: GReturn = decode(decoder);
    if (!decoder.done) {
      throw new Error(`${decoder.remaining} bytes remaining.`);
    }
    return result;
  }

  /**
   * Decodes a `string`.
   */
  static string(bytes: Uint8Array, options?: DecoderStringOptions): string {
    return this.decode<string>(bytes, (decoder: Decoder): string => {
      return decoder.string(decoder.remaining, options);
    });
  }

  /**
   * Decodes a `json` value.
   */
  static json<GValue>(
    bytes: Uint8Array,
    reviver?: (this: any, key: string, value: any) => any,
  ): GValue {
    return JSON.parse(new TextDecoder().decode(bytes), reviver);
  }

  readonly #bytes: Uint8Array;
  readonly #view: DataView;
  #cursor: number;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#view = new DataView(this.#bytes.buffer, this.#bytes.byteOffset, this.#bytes.byteLength);
    this.#cursor = 0;
  }

  /**
   * Consumes `size` bytes.
   */
  #consume(size: number): number {
    const cursor: number = this.#cursor;
    const newCursor: number = cursor + size;

    if (newCursor > this.#bytes.length) {
      throw new Error('Size limit reached.');
    }

    this.#cursor = newCursor;

    return cursor;
  }

  /**
   * Returns the total number of bytes.
   */
  get length(): number {
    return this.#bytes.length;
  }

  /**
   * Returns the current number of consumed bytes.
   */
  get consumed(): number {
    return this.#cursor;
  }

  /**
   * Returns the remaining number of consumable bytes.
   */
  get remaining(): number {
    return this.#bytes.length - this.#cursor;
  }

  /**
   * Returns `true` if all bytes have been consumed.
   */
  get done(): boolean {
    return this.#cursor === this.#bytes.length;
  }

  // toUint8Array(): Uint8Array {
  //   return new Uint8Array(this.#bytes.buffer, this.#bytes.byteOffset, this.#cursor);
  // }
  //
  // complete(): void {
  //   if (this.#cursor !== this.#bytes.length) {
  //     throw new Error(`${this.#bytes.length - this.#cursor} bytes remaining.`);
  //   }
  // }

  // decode<GReturn>(decode: DecodeFunction<GReturn>): GReturn {
  //   return decode(this);
  // }

  /**
   * Reads an `int8` from this Decoder, and moves the cursor of 1 byte for the next _read_
   */
  int8(): number {
    return this.#view.getInt8(this.#consume(1));
  }

  #int16(littleEndian: boolean): number {
    return this.#view.getInt16(this.#consume(2), littleEndian);
  }

  /**
   * Reads an `int16` represented as _little-endian_ from this Decoder.
   */
  int16LE(): number {
    return this.#int16(true);
  }

  /**
   * Reads an `int16` represented as _big-endian_ from this Decoder.
   */
  int16BE(): number {
    return this.#int16(false);
  }

  #int32(littleEndian: boolean): number {
    return this.#view.getInt32(this.#consume(4), littleEndian);
  }

  int32LE(): number {
    return this.#int32(true);
  }

  int32BE(): number {
    return this.#int32(false);
  }

  #int64(littleEndian: boolean): bigint {
    return this.#view.getBigInt64(this.#consume(8), littleEndian);
  }

  int64LE(): bigint {
    return this.#int64(true);
  }

  int64BE(): bigint {
    return this.#int64(false);
  }

  uint8(): number {
    return this.#view.getUint8(this.#consume(1));
  }

  #uint16(littleEndian: boolean): number {
    return this.#view.getUint16(this.#consume(2), littleEndian);
  }

  uint16LE(): number {
    return this.#uint16(true);
  }

  uint16BE(): number {
    return this.#uint16(false);
  }

  #uint32(littleEndian: boolean): number {
    return this.#view.getUint32(this.#consume(4), littleEndian);
  }

  uint32LE(): number {
    return this.#uint32(true);
  }

  uint32BE(): number {
    return this.#uint32(false);
  }

  #uint64(littleEndian: boolean): bigint {
    return this.#view.getBigUint64(this.#consume(8), littleEndian);
  }

  uint64LE(): bigint {
    return this.#uint64(true);
  }

  uint64BE(): bigint {
    return this.#uint64(false);
  }

  #float16(littleEndian: boolean): number {
    /* istanbul ignore if -- @preserve */
    if (this.#view.setFloat16 === undefined) {
      return get_float_16(this.#view, this.#consume(2), littleEndian);
      /* istanbul ignore else -- @preserve */
    } else {
      return this.#view.getFloat16(this.#consume(2), littleEndian);
    }
  }

  float16LE(): number {
    return this.#float16(true);
  }

  float16BE(): number {
    return this.#float16(false);
  }

  #float32(littleEndian: boolean): number {
    return this.#view.getFloat32(this.#consume(4), littleEndian);
  }

  float32LE(): number {
    return this.#float32(true);
  }

  float32BE(): number {
    return this.#float32(false);
  }

  #float64(littleEndian: boolean): number {
    return this.#view.getFloat64(this.#consume(8), littleEndian);
  }

  float64LE(): number {
    return this.#float64(true);
  }

  float64BE(): number {
    return this.#float64(false);
  }

  /**
   * Reads an `Uint8Array` from this Decoder.
   */
  bytes(length: number): Uint8Array {
    const index: number = this.#consume(length);
    return this.#bytes.subarray(index, index + length);
  }

  /**
   * Reads a `string` from this Decoder.
   *
   * The string may be encoded in different formats:
   *
   * - `utf-8` _(default)_: encodes the string in utf-8 format.
   * - `binary`: encodes the string in _binary_ format.
   * - `hex`: encodes the string in _hex_ format (ex: `0AF3`).
   * - `base64`: encodes the string in _base64_ format (ex: `YWJjZA==`).
   * - any [valid labels](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings): encodes the string according to this format, if it is supported.
   */
  string(length: number, { encoding, ...options }: DecoderStringOptions = {}): string {
    switch (encoding) {
      case 'binary': {
        let output: string = '';
        let j: number = this.#consume(length);
        for (let i: number = 0; i < length; i++, j++) {
          output += String.fromCharCode(this.#bytes[j]);
        }
        return output;
      }
      case 'hex': {
        // TODO => replace when widely available
        // const i: number = this.#consume(length);
        // return this.#bytes.subarray(i, i + length).toHex();
        let output: string = '';
        let j: number = this.#consume(length);
        for (let i: number = 0; i < length; i++, j++) {
          output += this.#bytes[j].toString(16).padStart(2, '0');
        }
        if ((options as Omit<DecoderStringHexOptions, 'encoding'>).uppercase) {
          output = output.toUpperCase();
        }
        return output;
      }
      case 'base64': {
        // TODO => replace when widely available
        // const i: number = this.#consume(length);
        // return this.#bytes.subarray(i, i + length).toBase64(options);
        return btoa(this.string(length, { encoding: 'binary' }));
      }
      case 'quoted-printable': {
        // https://datatracker.ietf.org/doc/html/rfc2045#section-6.7
        // https://en.wikipedia.org/wiki/Quoted-printable
        // https://www.webatic.com/quoted-printable-convertor
        // https://github.com/mathiasbynens/quoted-printable/blob/master/src/quoted-printable.js

        const start: number = this.#consume(length);

        let output: Uint8Array = new Uint8Array(length);
        let outputLength: number = 0;

        const lengthMinusOne: number = length - 1;
        const lengthMinusTwo: number = length - 2;

        const error = (message: string): never => {
          throw new Error(`Invalid quoted-printable encoding: ${message}`);
        };

        const removeTrailingWhiteSpaces = (): void => {
          // “Therefore, when decoding a `Quoted-Printable` body, any trailing white
          // space on a line must be deleted, as it will necessarily have been added
          // by intermediate transport agents.”
          while (outputLength >= 0 && isTabOrSpace(output[outputLength - 1])) {
            outputLength--;
          }
        };

        for (let i: number = 0; i < length; i++) {
          const index: number = start + i;
          const byte: number = this.#bytes[index];

          if (byte === 0x3d /* = */) {
            if (i >= lengthMinusTwo) {
              error('found an equal sign without without two following characters.');
            }

            const a: number = this.#bytes[index + 1];
            const b: number = this.#bytes[index + 2];
            i += 2;

            if (a === 0x0d /* \r */) {
              if (b !== 0x0a /* \n */) {
                error('found a CR sequence without a following LF.');
              } // else "soft line break" -> ignore
            } else {
              output[outputLength++] =
                (singleAlphanumericToNumber(a) << 4) | singleAlphanumericToNumber(b);
            }
          } else if (byte === 0x0d /* \r */) {
            if (i >= lengthMinusOne || this.#bytes[index + 1] !== 0x0a /* \n */) {
              error('found a CR sequence without a following LF.');
            } // else "meaningful line break"

            i += 1;

            removeTrailingWhiteSpaces();

            output[outputLength++] = 0x0d /* \r */;
            output[outputLength++] = 0x0a /* \n */;
          } else {
            output[outputLength++] = byte;
          }
        }

        removeTrailingWhiteSpaces();

        return Decoder.string(
          output.subarray(0, outputLength),
          (options as Omit<DecoderStringQuotedPrintableOptions, 'encoding'>).sub,
        );
      }
      default:
        return new TextDecoder(encoding, options as TextDecoderOptions).decode(this.bytes(length));
    }
  }

  /**
   * Reads `length` bytes from this Decoder as string, and returns `JSON.parse(...)` of this string.
   */
  json<GValue>(length: number, reviver?: (this: any, key: string, value: any) => any): GValue {
    return JSON.parse(this.string(length), reviver);
  }
}
