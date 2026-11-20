import { type DecodeFunction } from './types/decode-function.js';
import { type DecoderStringOptions } from './types/methods/string/decoder-string-options.js';

/**
 * Used to _decode_ an `Uint8Array` into various kind of data.
 *
 * > **WARNING:** until a Decoder is `done`, the source bytes and every
 * `Uint8Array` it returned must be treated as readonly: do not mutate the
 * source, the results of `bytes()`, `toUint8Array()`, or `fork()` windows,
 * so that no data changes on the fly during reads. Once `done`, mutation
 * is safe.
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
    const result: GReturn = decoder.decode(decode);
    decoder.complete();
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
    return this.decode<GValue>(bytes, (decoder: Decoder): GValue => {
      return decoder.json<GValue>(decoder.remaining, reviver);
    });
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
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new RangeError(`Invalid size: ${size}.`);
    }

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

  /**
   * Returns an `Uint8Array` containing the bytes consumed so far.
   *
   * > **INFO:** the returned array is a zero-copy view over the source bytes:
   * mutating it mutates the source, and it retains the source's backing
   * buffer even after the Decoder is discarded. Treat it as readonly while
   * this Decoder is not `done`.
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.#bytes.buffer, this.#bytes.byteOffset, this.#cursor);
  }

  /**
   * Throws if some bytes have not been consumed yet.
   */
  complete(): void {
    if (!this.done) {
      throw new Error(`${this.remaining} bytes remaining.`);
    }
  }

  /**
   * Calls the function `decode` with `this` as argument, and returns its result.
   *
   * > **INFO:** this is useful to decode a value from this Decoder based on an external function.
   */
  decode<GReturn>(decode: DecodeFunction<GReturn>): GReturn {
    return decode(this);
  }

  /**
   * Creates a new `Decoder` bounded to the next `length` bytes of this Decoder,
   * calls the function `decode` with it as argument, and returns its result.
   *
   * Then, if the child `Decoder` consumed its whole window, moves the cursor of
   * this Decoder of `length` bytes, else an `Error` is thrown and this Decoder
   * is left untouched.
   *
   * > **INFO:** the child `Decoder` decodes a live subarray of the source bytes:
   * mutations are visible on both sides.
   *
   * @param {number} length The length of the window to decode. A non-safe-integer
   * or negative length throws a `RangeError`, and a length over the remaining
   * bytes throws an `Error`.
   * @returns {GReturn} The result of the `decode` function.
   */
  fork<GReturn>(length: number, decode: DecodeFunction<GReturn>): GReturn {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new RangeError(`Invalid length: ${length}.`);
    }

    if (length > this.remaining) {
      throw new Error('Size limit reached.');
    }

    const child: Decoder = new Decoder(this.#bytes.subarray(this.#cursor, this.#cursor + length));
    const result: GReturn = decode(child);
    child.complete();

    this.#cursor += length;

    return result;
  }

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

  #decodeUintX(bytes: number, littleEndian: boolean): bigint {
    const start: number = this.#consume(bytes);
    let packed: bigint = 0n;

    if (littleEndian) {
      for (let i: number = bytes - 1; i >= 0; i--) {
        packed = (packed << 8n) | BigInt(this.#bytes[start + i]);
      }
    } else {
      for (let i: number = 0; i < bytes; i++) {
        packed = (packed << 8n) | BigInt(this.#bytes[start + i]);
      }
    }

    return packed;
  }

  #decodeIntX(bytes: number, littleEndian: boolean): bigint {
    const value: bigint = this.#decodeUintX(bytes, littleEndian);

    const shift: bigint = BigInt(bytes - 1) * 8n;
    const max: bigint = 0x80n << shift;

    if (value >= max) {
      return value - (0x100n << shift);
    }

    return value;
  }

  #int24(littleEndian: boolean): number {
    return Number(this.#decodeIntX(3, littleEndian));
  }

  /**
   * Reads an `int24` represented as _little-endian_ from this Decoder.
   */
  int24LE(): number {
    return this.#int24(true);
  }

  /**
   * Reads an `int24` represented as _big-endian_ from this Decoder.
   */
  int24BE(): number {
    return this.#int24(false);
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

  #int40(littleEndian: boolean): number {
    return Number(this.#decodeIntX(5, littleEndian));
  }

  /**
   * Reads an `int40` represented as _little-endian_ from this Decoder.
   */
  int40LE(): number {
    return this.#int40(true);
  }

  /**
   * Reads an `int40` represented as _big-endian_ from this Decoder.
   */
  int40BE(): number {
    return this.#int40(false);
  }

  #int48(littleEndian: boolean): number {
    return Number(this.#decodeIntX(6, littleEndian));
  }

  /**
   * Reads an `int48` represented as _little-endian_ from this Decoder.
   */
  int48LE(): number {
    return this.#int48(true);
  }

  /**
   * Reads an `int48` represented as _big-endian_ from this Decoder.
   */
  int48BE(): number {
    return this.#int48(false);
  }

  #int56(littleEndian: boolean): bigint {
    return this.#decodeIntX(7, littleEndian);
  }

  /**
   * Reads an `int56` represented as _little-endian_ from this Decoder.
   */
  int56LE(): bigint {
    return this.#int56(true);
  }

  /**
   * Reads an `int56` represented as _big-endian_ from this Decoder.
   */
  int56BE(): bigint {
    return this.#int56(false);
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

  #uint24(littleEndian: boolean): number {
    return Number(this.#decodeUintX(3, littleEndian));
  }

  /**
   * Reads a `uint24` represented as _little-endian_ from this Decoder.
   */
  uint24LE(): number {
    return this.#uint24(true);
  }

  /**
   * Reads a `uint24` represented as _big-endian_ from this Decoder.
   */
  uint24BE(): number {
    return this.#uint24(false);
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

  #uint40(littleEndian: boolean): number {
    return Number(this.#decodeUintX(5, littleEndian));
  }

  /**
   * Reads a `uint40` represented as _little-endian_ from this Decoder.
   */
  uint40LE(): number {
    return this.#uint40(true);
  }

  /**
   * Reads a `uint40` represented as _big-endian_ from this Decoder.
   */
  uint40BE(): number {
    return this.#uint40(false);
  }

  #uint48(littleEndian: boolean): number {
    return Number(this.#decodeUintX(6, littleEndian));
  }

  /**
   * Reads a `uint48` represented as _little-endian_ from this Decoder.
   */
  uint48LE(): number {
    return this.#uint48(true);
  }

  /**
   * Reads a `uint48` represented as _big-endian_ from this Decoder.
   */
  uint48BE(): number {
    return this.#uint48(false);
  }

  #uint56(littleEndian: boolean): bigint {
    return this.#decodeUintX(7, littleEndian);
  }

  /**
   * Reads a `uint56` represented as _little-endian_ from this Decoder.
   */
  uint56LE(): bigint {
    return this.#uint56(true);
  }

  /**
   * Reads a `uint56` represented as _big-endian_ from this Decoder.
   */
  uint56BE(): bigint {
    return this.#uint56(false);
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
    return this.#view.getFloat16(this.#consume(2), littleEndian);
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
   *
   * > **INFO:** the returned array is a live subarray of the source bytes:
   * mutations are visible on both sides. Treat it as readonly while this
   * Decoder is not `done`.
   *
   * @param {number} [length] The length of the bytes to read.
   * @returns {Uint8Array} The read bytes.
   */
  bytes(length: number = this.remaining): Uint8Array {
    const index: number = this.#consume(length);
    return this.#bytes.subarray(index, index + length);
  }

  /**
   * Reads a `string` from this Decoder.
   *
   * The string, represented as bytes in this Decoder, has been encoded with a specific `encoding`,
   * thus, we have to decode it using the same specific `encoding`:
   *
   * - `utf-8` _(default)_: decodes the string with the _utf-8_ encoding.
   * - `binary`: returns a string in _binary_ format (no encoding).
   * - any [valid labels](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings): decodes string according to this format, if it is supported.
   */
  string(
    length: number = this.remaining,
    { encoding, ...options }: DecoderStringOptions = {},
  ): string {
    switch (encoding) {
      case 'binary': {
        let output: string = '';
        let j: number = this.#consume(length);
        for (let i: number = 0; i < length; i++, j++) {
          output += String.fromCharCode(this.#bytes[j]);
        }
        return output;
      }
      default:
        return new TextDecoder(encoding, options as TextDecoderOptions).decode(this.bytes(length));
    }
  }

  /**
   * Reads `length` bytes from this Decoder as string, and returns `JSON.parse(...)` of this string.
   */
  json<GValue>(
    length: number = this.remaining,
    reviver?: (this: any, key: string, value: any) => any,
  ): GValue {
    return JSON.parse(this.string(length), reviver);
  }
}
