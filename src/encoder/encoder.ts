import { Decoder } from '../decoder/decoder.js';
import { set_float_16 } from '../functions.private/f16.skip-test/set_float_16.js';
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
   *     .int16LE(input)
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
    return new TextEncoder().encode(JSON.stringify(value, replacer, space));
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
      this.#buffer.resize(
        Math.min(
          this.#buffer.maxByteLength,
          (1 <<
            Math.ceil(
              Math.log2(newCursor) /* number of bytes to store the data */ +
                0.5 /* adds a "half-byte" of margin */,
            )) /* round to the upper limit */ >>>
            0,
        ),
      );
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
    /* istanbul ignore if -- @preserve */
    if (this.#view.setFloat16 === undefined) {
      set_float_16(this.#view, this.#alloc(2), value, littleEndian);
      /* istanbul ignore else -- @preserve */
    } else {
      this.#view.setFloat16(this.#alloc(2), value, littleEndian);
    }
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

  // arrayBufferView(
  //   value:
  //     | Uint8Array
  //     | Uint16Array
  //     | Uint32Array
  //     | BigUint64Array
  //     | Int8Array
  //     | Int16Array
  //     | Int32Array
  //     | BigInt64Array
  //     | Float16Array
  //     | Float32Array
  //     | Float64Array,
  //   littleEndian: boolean = this.#littleEndian,
  // ): void {
  //   if (value instanceof Uint8Array) {
  //     this.bytes(value);
  //   } else {
  //     if (value instanceof Int8Array || isLittleEndianPlatform() === littleEndian) {
  //       this.bytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  //     } else {
  //       if (value instanceof Uint16Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.uint16(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Uint32Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.uint32(value[i], littleEndian);
  //         }
  //       } else if (value instanceof BigUint64Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.uint64(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Int16Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.int16(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Int32Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.int32(value[i], littleEndian);
  //         }
  //       } else if (value instanceof BigInt64Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.int64(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Float16Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.float16(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Float32Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.float32(value[i], littleEndian);
  //         }
  //       } else if (value instanceof Float64Array) {
  //         for (let i: number = 0; i < value.length; i++) {
  //           this.float64(value[i], littleEndian);
  //         }
  //       }
  //     }
  //   }
  // }

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
        this.bytes(new TextEncoder().encode(value));
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
