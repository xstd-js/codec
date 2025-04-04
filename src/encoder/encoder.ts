import { set_float_16 } from '../functions.private/set_float_16.js';
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
   * When a resize is required, it multiplies the allocated bytes by: `1 << resizeFactor`
   *
   * - _range_: `[1, 4]`
   *
   * @default 1
   */
  readonly resizeFactor?: number;

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
  readonly #resizeFactor: number;

  // the raw buffer containing the bytes.
  readonly #buffer: ArrayBuffer;
  // a DataView on this buffer.
  readonly #view: DataView;
  // an Uint8Array on this buffer.
  readonly #bytes: Uint8Array;
  // the current number of allocated bytes (defines where we should write next).
  #cursor: number;

  constructor({
    initialByteLength = 0x100,
    resizeFactor = 1,
    maxByteLength = 32,
  }: EncoderOptions = {}) {
    initialByteLength = Math.max(0, Math.min(0x100000000, Math.floor(initialByteLength)));
    resizeFactor = 1 << Math.max(1, Math.min(4, Math.floor(resizeFactor)));
    maxByteLength = Math.max(initialByteLength, Math.min(0x100000000, Math.floor(maxByteLength)));

    this.#resizeFactor = resizeFactor;
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
          this.#buffer.byteLength === 0
            ? this.#resizeFactor
            : this.#buffer.byteLength * this.#resizeFactor,
        ),
      );
    }

    this.#cursor = newCursor;

    return cursor;
  }

  /**
   * Returns the current number of allocated bytes.
   */
  get allocated(): number {
    return this.#cursor;
  }

  /**
   * Returns an `Uint8Array` containing the encoded values.
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.#buffer, 0, this.#cursor);
  }

  /*
     INFO: All the following methods return `this`, enabling us to chain them.
     INFO: Each _write_ moves the `cursor` and grows the encoded bytes.
   */

  /**
   * Calls the function `apply` with `this` as first and only argument.
   *
   * > **INFO:** this is useful to _apply_ an `encode` function to this Encoder.
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
   *  .apply((encoder: Encoder) => encodeBinaryString(encoder, 'abc')))
   *  // other operations...
   *  .toUint8Array();
   * ```
   */
  apply(apply: (encoder: this) => void): this {
    apply(this);
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
    /* istanbul ignore else -- @preserve */
    if (this.#view.setFloat16 === undefined) {
      set_float_16(this.#view, this.#alloc(2), value, littleEndian);
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
  bytes(value: Uint8Array): this {
    this.#bytes.set(value, this.#alloc(value.length));
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
   * The string may be encoded in different formats:
   *
   * - `utf-8` _(default)_: encodes the string in utf-8 format, and appends the bytes into this Encoder's bytes.
   * - `binary`: assumes the string is a _binary string_, and appends each byte of this string, into this Encoder's bytes.
   * - `hex`: assumes the string is an _hex string_ (ex: `0AF3`), and appends each decoded byte of this string, into this Encoder's bytes.
   * - `base64`: assumes the string is an _base64 string_ (ex: `YWJjZA==`), and appends each decoded byte of this string, into this Encoder's bytes.
   */
  string(
    value: string,
    { encoding = 'utf-8' /* TODO: , ...options */ }: EncoderStringOptions = {},
  ): this {
    switch (encoding) {
      case 'utf-8':
        this.bytes(new TextEncoder().encode(value));
        break;
      case 'binary': {
        const length: number = value.length;
        let j: number = this.#alloc(length);
        for (let i: number = 0; i < length; i++, j++) {
          const char: number = value.charCodeAt(i);
          if (char > 0xff) {
            throw new RangeError(`Char ${JSON.stringify(value.at(i))} at ${i} out of range.`);
          }
          this.#bytes[j] = value.charCodeAt(i);
        }
        break;
      }
      case 'hex': {
        // TODO => replace when widely available
        // this.#bytes.setFromHex(value, this.#alloc(value.length / 2));
        const length: number = value.length / 2;
        let j: number = this.#alloc(length);
        for (let i: number = 0; i < length; i++, j += 2) {
          const byte: number = parseInt(value.slice(j, j + 2), 16);
          if (Number.isNaN(byte)) {
            throw new Error(`Char ${JSON.stringify(value.at(i))} at ${i} is not a valid hex char.`);
          }
          this.#bytes[i] = byte;
        }
        break;
      }
      case 'base64': {
        // TODO => replace when widely available
        // this.#bytes.setFromBase64(value);
        // bytes = Uint8Array.fromBase64(value, options);
        // break;
        this.string(atob(value), { encoding: 'binary' });
        break;
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
}
