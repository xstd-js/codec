import { Decoder } from '../decoder/decoder.js';
import { TEXT_ENCODER } from './constants.private/text-encoder.js';
import { computeGrownByteLength } from './helpers.private/compute-grown-byte-length/compute-grown-byte-length.js';
import { type EncodeFunction } from './types/encode-function.js';
import { type EncoderStringOptions } from './types/methods/string/encoder-string-options.js';

/**
 * The optional options to provide to an `Encoder`.
 */
export interface EncoderOptions {
  /**
   * The _initial_ allocated byte length
   *
   * - _range_: `[0, 0x100000000]`
   *
   * @default 0x100
   */
  readonly initialByteLength?: number;

  /**
   * The _max_ allocated byte length
   *
   * - _range_: `[initialByteLength, 0x100000000]`
   *
   * @default 0x100000000
   */
  readonly maxByteLength?: number;
}

/**
 * Used to _encode_ various kind of data into an `Uint8Array`.
 *
 * @example
 *
 * Encodes a _binary_ string:
 *
 * ```ts
 * const str: string = 'abc';
 *
 * const bytes = new Encoder()
 *  .int16LE(str.length) // encodes the string's length
 *  .string(str, { encoding: 'binary' }) // encodes the string as binary
 *  .toUint8Array();
 *
 *  // bytes => [3, 0, 97, 98, 99]
 * ```
 */
export class Encoder {
  /**
   * Creates a new `Encoder` and immediately calls the `encode` function with this Encoder and the provided value as arguments.
   *
   * Then, it returns the resulting Uint8Array containing the encoded value.
   *
   * @example:
   *
   * ```ts
   * function encodeBinaryString(encoder: Encoder, input: string): void {
   *   encoder
   *     .int16LE(input.length)
   *     .string(input, { encoding: 'binary' });
   * }
   *
   * const bytes = Encoder.encode('abc', encodeBinaryString);
   * ```
   */
  static encode<GValue>(
    value: GValue,
    encode: EncodeFunction<GValue>,
    options?: EncoderOptions,
  ): Uint8Array {
    return new Encoder(options).encode(value, encode).toUint8Array();
  }

  /**
   * Encodes a `string`.
   */
  static string(value: string, options?: EncoderStringOptions): Uint8Array {
    return this.encode<string>(value, (encoder: Encoder): void => {
      encoder.string(value, options);
    });
  }

  /**
   * Encodes a `json` value.
   */
  static json(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): Uint8Array {
    return this.encode(value, (encoder: Encoder): void => {
      encoder.json(value, replacer, space);
    });
  }

  // the raw buffer containing the bytes.
  readonly #buffer: ArrayBuffer;
  // a DataView on this buffer.
  readonly #view: DataView;
  // an Uint8Array on this buffer.
  readonly #bytes: Uint8Array;
  // the current number of allocated bytes (defines where we should write next).
  #cursor: number;

  constructor({ initialByteLength = 0x100, maxByteLength = 0x100000000 }: EncoderOptions = {}) {
    initialByteLength = Math.max(0, Math.min(0x100000000, Math.floor(initialByteLength)));
    maxByteLength = Math.max(initialByteLength, Math.min(0x100000000, Math.floor(maxByteLength)));

    this.#buffer = new ArrayBuffer(initialByteLength, {
      maxByteLength,
    });
    this.#view = new DataView(this.#buffer);
    this.#bytes = new Uint8Array(this.#buffer);
    this.#cursor = 0;
  }

  /**
   * Allocates `size` bytes.
   *
   * > **INFO:** resizes the `#buffer` if required.
   */
  #alloc(size: number): number {
    const cursor: number = this.#cursor;
    const newCursor: number = cursor + size;

    if (newCursor > this.#buffer.maxByteLength) {
      throw new Error('Size limit reached.');
    }

    if (newCursor > this.#buffer.byteLength) {
      this.#buffer.resize(computeGrownByteLength(newCursor, this.#buffer.maxByteLength));
    }

    this.#cursor = newCursor;

    return cursor;
  }

  /**
   * Returns the current number of written bytes.
   */
  get length(): number {
    return this.#cursor;
  }

  /**
   * Returns an `Uint8Array` containing the encoded values.
   *
   * > **INFO:** the returned array is a zero-copy view over this Encoder's
   * internal buffer: mutating it mutates the Encoder state, and it retains
   * the whole backing buffer even after the Encoder is discarded.
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.#buffer, 0, this.#cursor);
  }

  toDecoder(): Decoder {
    return new Decoder(this.toUint8Array());
  }

  /*
     INFO: All the following methods return `this`, enabling us to chain them.
     INFO: Each _write_ moves the `cursor` and grows the encoded bytes.
     INFO: All writes are atomic — if the size limit is reached, the write
           throws before moving the cursor, leaving `length` unchanged —
           except `string({ encoding: 'binary' })`, which validates characters
           while writing: if it throws, the bytes written so far are left in
           an unspecified state: discard the Encoder instance rather than
           reusing it.
   */

  /**
   * Calls the function `encode` with `this` and `value` as arguments.
   *
   * > **INFO:** this is useful to encode a value in this Encoder based on an external function.
   *
   * @example:
   *
   * ```ts
   * function encodeBinaryString(encoder: Encoder, input: string): void {
   *   encoder
   *     .int16LE(input)
   *     .string(input, { encoding: 'binary' });
   * }
   *
   * const bytes = new Encoder()
   *  .encode('abc', encodeBinaryString)
   *  // other operations...
   *  .toUint8Array();
   * ```
   */
  encode<GValue>(value: GValue, encode: EncodeFunction<GValue>): this {
    encode(this, value);
    return this;
  }

  /**
   * Writes an `int8` in this Encoder, and moves the cursor of 1 byte for the next _write_
   */
  int8(value: number): this {
    this.#view.setInt8(this.#alloc(1), value);
    return this;
  }

  #int16(value: number, littleEndian: boolean): this {
    this.#view.setInt16(this.#alloc(2), value, littleEndian);
    return this;
  }

  /**
   * Writes an `int16` represented as _little-endian_ in this Encoder.
   */
  int16LE(value: number): this {
    return this.#int16(value, true);
  }

  /**
   * Writes an `int16` represented as _big-endian_ in this Encoder.
   */
  int16BE(value: number): this {
    return this.#int16(value, false);
  }

  #encodeUintX(value: bigint | number, bytes: number, littleEndian: boolean): void {
    const start: number = this.#alloc(bytes);

    // NOTE: `BigInt.asUintN` makes the two's complement wrap deterministic:
    // `DataView.setBigUint64` itself rejects negative BigInts on some engines.
    const packed: bigint = BigInt.asUintN(64, BigInt(value));

    for (let i: number = 0; i < bytes; i++) {
      const shift: bigint = BigInt(littleEndian ? i : bytes - 1 - i) * 8n;
      this.#bytes[start + i] = Number((packed >> shift) & 0xffn);
    }
  }

  #int24(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 3, littleEndian);
    return this;
  }

  /**
   * Writes an `int24` represented as _little-endian_ in this Encoder.
   */
  int24LE(value: number): this {
    return this.#int24(value, true);
  }

  /**
   * Writes an `int24` represented as _big-endian_ in this Encoder.
   */
  int24BE(value: number): this {
    return this.#int24(value, false);
  }

  #int32(value: number, littleEndian: boolean): this {
    this.#view.setInt32(this.#alloc(4), value, littleEndian);
    return this;
  }

  int32LE(value: number): this {
    return this.#int32(value, true);
  }

  int32BE(value: number): this {
    return this.#int32(value, false);
  }

  #int40(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 5, littleEndian);
    return this;
  }

  /**
   * Writes an `int40` represented as _little-endian_ in this Encoder.
   */
  int40LE(value: number): this {
    return this.#int40(value, true);
  }

  /**
   * Writes an `int40` represented as _big-endian_ in this Encoder.
   */
  int40BE(value: number): this {
    return this.#int40(value, false);
  }

  #int48(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 6, littleEndian);
    return this;
  }

  /**
   * Writes an `int48` represented as _little-endian_ in this Encoder.
   */
  int48LE(value: number): this {
    return this.#int48(value, true);
  }

  /**
   * Writes an `int48` represented as _big-endian_ in this Encoder.
   */
  int48BE(value: number): this {
    return this.#int48(value, false);
  }

  #int56(value: bigint | number, littleEndian: boolean): this {
    this.#encodeUintX(value, 7, littleEndian);
    return this;
  }

  /**
   * Writes an `int56` represented as _little-endian_ in this Encoder.
   */
  int56LE(value: bigint | number): this {
    return this.#int56(value, true);
  }

  /**
   * Writes an `int56` represented as _big-endian_ in this Encoder.
   */
  int56BE(value: bigint | number): this {
    return this.#int56(value, false);
  }

  #int64(value: bigint | number, littleEndian: boolean): this {
    this.#view.setBigInt64(
      this.#alloc(8),
      typeof value === 'number' ? BigInt(value) : value,
      littleEndian,
    );
    return this;
  }

  int64LE(value: bigint | number): this {
    return this.#int64(value, true);
  }

  int64BE(value: bigint | number): this {
    return this.#int64(value, false);
  }

  uint8(value: number): this {
    this.#view.setUint8(this.#alloc(1), value);
    return this;
  }

  #uint16(value: number, littleEndian: boolean): this {
    this.#view.setUint16(this.#alloc(2), value, littleEndian);
    return this;
  }

  uint16LE(value: number): this {
    return this.#uint16(value, true);
  }

  uint16BE(value: number): this {
    return this.#uint16(value, false);
  }

  #uint24(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 3, littleEndian);
    return this;
  }

  /**
   * Writes a `uint24` represented as _little-endian_ in this Encoder.
   */
  uint24LE(value: number): this {
    return this.#uint24(value, true);
  }

  /**
   * Writes a `uint24` represented as _big-endian_ in this Encoder.
   */
  uint24BE(value: number): this {
    return this.#uint24(value, false);
  }

  #uint32(value: number, littleEndian: boolean): this {
    this.#view.setUint32(this.#alloc(4), value, littleEndian);
    return this;
  }

  uint32LE(value: number): this {
    return this.#uint32(value, true);
  }

  uint32BE(value: number): this {
    return this.#uint32(value, false);
  }

  #uint40(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 5, littleEndian);
    return this;
  }

  /**
   * Writes a `uint40` represented as _little-endian_ in this Encoder.
   */
  uint40LE(value: number): this {
    return this.#uint40(value, true);
  }

  /**
   * Writes a `uint40` represented as _big-endian_ in this Encoder.
   */
  uint40BE(value: number): this {
    return this.#uint40(value, false);
  }

  #uint48(value: number, littleEndian: boolean): this {
    this.#encodeUintX(value, 6, littleEndian);
    return this;
  }

  /**
   * Writes a `uint48` represented as _little-endian_ in this Encoder.
   */
  uint48LE(value: number): this {
    return this.#uint48(value, true);
  }

  /**
   * Writes a `uint48` represented as _big-endian_ in this Encoder.
   */
  uint48BE(value: number): this {
    return this.#uint48(value, false);
  }

  #uint56(value: bigint | number, littleEndian: boolean): this {
    this.#encodeUintX(value, 7, littleEndian);
    return this;
  }

  /**
   * Writes a `uint56` represented as _little-endian_ in this Encoder.
   */
  uint56LE(value: bigint | number): this {
    return this.#uint56(value, true);
  }

  /**
   * Writes a `uint56` represented as _big-endian_ in this Encoder.
   */
  uint56BE(value: bigint | number): this {
    return this.#uint56(value, false);
  }

  #uint64(value: bigint | number, littleEndian: boolean): this {
    this.#view.setBigUint64(
      this.#alloc(8),
      typeof value === 'number' ? BigInt(value) : value,
      littleEndian,
    );
    return this;
  }

  uint64LE(value: bigint | number): this {
    return this.#uint64(value, true);
  }

  uint64BE(value: bigint | number): this {
    return this.#uint64(value, false);
  }

  #float16(value: number, littleEndian: boolean): this {
    this.#view.setFloat16(this.#alloc(2), value, littleEndian);
    return this;
  }

  float16LE(value: number): this {
    return this.#float16(value, true);
  }

  float16BE(value: number): this {
    return this.#float16(value, false);
  }

  #float32(value: number, littleEndian: boolean): this {
    this.#view.setFloat32(this.#alloc(4), value, littleEndian);
    return this;
  }

  float32LE(value: number): this {
    return this.#float32(value, true);
  }

  float32BE(value: number): this {
    return this.#float32(value, false);
  }

  #float64(value: number, littleEndian: boolean): this {
    this.#view.setFloat64(this.#alloc(8), value, littleEndian);
    return this;
  }

  float64LE(value: number): this {
    return this.#float64(value, true);
  }

  float64BE(value: number): this {
    return this.#float64(value, false);
  }

  /**
   * Writes an `Uint8Array` in this Encoder.
   */
  bytes(bytes: Uint8Array): this {
    this.#bytes.set(bytes, this.#alloc(bytes.length));
    return this;
  }

  /**
   * Writes a `string` in this Encoder.
   *
   * The string will be converted to bytes in this Encoder using a specific `encoding`:
   *
   * - `utf-8` _(default)_: encodes the string as an _utf-8 string_.
   * - `binary`: assumes that the provided string is a _binary string_, and appends each byte of this string, into this Encoder's bytes.
   */
  string(value: string, { encoding = 'utf-8' }: EncoderStringOptions = {}): this {
    switch (encoding) {
      case 'utf-8':
        this.bytes(TEXT_ENCODER.encode(value));
        break;
      case 'binary': {
        const length: number = value.length;
        let inputIndex: number = 0;
        let outputIndex: number = this.#alloc(length);
        while (inputIndex < length) {
          const char: number = value.charCodeAt(inputIndex++);
          if (char > 0xff) {
            inputIndex--;
            throw new RangeError(
              `Char ${JSON.stringify(value.at(inputIndex))} at ${inputIndex} out of range.`,
            );
          }
          this.#bytes[outputIndex++] = char;
        }
        break;
      }
      default: {
        throw new Error(`Unsupported encoding: ${encoding}`);
      }
    }
    return this;
  }

  /**
   * Stringify `value` using `JSON.stringify(...)` and writes the result in this Encoder.
   */
  json(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): this {
    return this.string(JSON.stringify(value, replacer, space));
  }

  /**
   * Iterates on `values` and calls the `encode` function with `this` and each individual values.
   *
   * @example:
   *
   * ```ts
   * const bytes = new Encoder()
   *   .iterable([1, 2, 3], (encoder: Encoder, value: number): void => {
   *     encoder.uint16BE(value);
   *   })
   *   .toUint8Array();
   * ```
   */
  iterable<GValue>(values: Iterable<GValue>, encode: EncodeFunction<GValue>): this {
    for (const value of values) {
      encode(this, value);
    }
    return this;
  }
}
