import { numberToSingleAlphanumeric } from '../functions.private/alphanumeric/number-to-single-alphanumeric.js';
import { set_float_16 } from '../functions.private/f16/set_float_16.js';
import { isSafeQuotedPrintableChar } from '../functions.private/quoted-printable/is-safe-quoted-printable-char.js';
import { isTabOrSpace } from '../functions.private/quoted-printable/is-tab-or-space.js';
import { type EncodeFunction } from './types/encode-function.js';
import {
  type EncoderStringOptions,
  type EncoderStringQuotedPrintableOptions,
} from './types/methods/string/encoder-string-options.js';

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
    maxByteLength = 0x100000000,
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
  string(value: string, { encoding = 'utf-8', ...options }: EncoderStringOptions = {}): this {
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
      case 'quoted-printable': {
        const { mode = 'text', sub }: Omit<EncoderStringQuotedPrintableOptions, 'encoding'> =
          options as Omit<EncoderStringQuotedPrintableOptions, 'encoding'>;

        const bytes: Uint8Array = Encoder.string(value, sub);

        const length: number = bytes.length;
        const lengthMinusOne: number = length - 1;

        const maxLineLength: number = 76;
        let currentLineLength: number = 0;

        switch (mode) {
          case 'text': {
            const lengthMinusTwo: number = length - 2;
            const sequence: Uint8Array = new Uint8Array(3);
            let sequenceLength: number = 0;

            for (let i: number = 0; i < length; i++) {
              const byte: number = bytes[i];

              if (byte === 0x0d /* \r */ && i < lengthMinusOne && bytes[i + 1] === 0x0a /* \n */) {
                // -> `byte` and the next one forms a "meaningful line break"
                encodeQuotedPrintableLineBreak(this);
                i += 1;
                currentLineLength = 0;
              } else {
                // INFO possible alternative
                // isSafeQuotedPrintableChar(byte) ||
                // (isTabOrSpace(byte) &&
                //   i !== lengthMinusOne /* is not last */ &&
                //   /* not followed by a line break */
                //   !(
                //     i < lengthMinusTwo &&
                //     bytes[i + 1] === 0x0d /* \r */ &&
                //     bytes[i + 2] === 0x0a /* \n */
                //   ) &&
                //   /* not followed by tab or space */
                //   (!isTabOrSpace(bytes[i + 1]) ||
                //     /* OR followed by tab or space AND */
                //     currentLineLength < maxLineLength - 1))

                if (
                  isSafeQuotedPrintableChar(byte) ||
                  (isTabOrSpace(byte) &&
                    /* not followed by a line break */
                    !(
                      i < lengthMinusTwo &&
                      bytes[i + 1] === 0x0d /* \r */ &&
                      bytes[i + 2] === 0x0a /* \n */
                    ))
                ) {
                  sequence[0] = byte;
                  sequenceLength = 1;
                } else {
                  // -> `byte` is NOT safe
                  // -> `byte` must be encoded
                  sequence[0] = 0x3d /* = */;
                  sequence[1] = numberToSingleAlphanumeric(byte >> 4, true);
                  sequence[2] = numberToSingleAlphanumeric(byte & 0x0f, true);
                  sequenceLength = 3;
                }

                // WRITE SEQUENCE

                // test if `sequence` can be written without exceeding `maxLineLength`:
                // - if it's the last sequence, at least `sequenceLength` chars must be available
                // - if it's not the last sequence, at least `sequenceLength + 1` chars must be available (to include a potential "soft line break": `=`)

                // first we compute the size of the "next" line break
                const lineBreakSize: number =
                  /* is last */
                  i === lengthMinusOne ||
                  /* is followed by a "meaningful line break"*/
                  (i < lengthMinusTwo &&
                    bytes[i + 1] === 0x0d /* \r */ &&
                    bytes[i + 2] === 0x0a) /* \n */
                    ? 0 /* if this is the last sequence, or it's followed by a "meaningful line break", then the "next" line break has a size of 0 */
                    : 1;

                if (
                  /* test if writing this sequence AND a "line break" will exceed `maxLineLength` */
                  currentLineLength + sequenceLength + lineBreakSize <=
                  maxLineLength
                ) {
                  // -> is safely writable
                  this.#bytes.set(sequence, this.#alloc(sequenceLength));
                  currentLineLength += sequenceLength;
                } else {
                  // -> writing this sequence AND a "line break" will exceed `maxLineLength`
                  // thus, we have to end the current line and continue on a new one
                  // for this, we introduce a "soft line break" and then write the sequence on the new line
                  encodeQuotedPrintableSoftLineBreak(this);
                  this.#bytes.set(sequence, this.#alloc(sequenceLength));
                  currentLineLength = sequenceLength;
                }
              }
            }
            break;
          }
          case 'binary': {
            const maxLineLengthMinusFour = maxLineLength - 4;

            for (let i: number = 0; i < length; i++) {
              const byte: number = bytes[i];

              if (
                /* test if writing this sequence AND a "soft line break" will exceed `maxLineLength` */
                // currentLineLength + (i === lengthMinusOne /* is last */ ? 3 : 4) >
                // maxLineLength
                /* => optimized version => */
                currentLineLength > maxLineLengthMinusFour
              ) {
                // -> writing this sequence AND a "soft line break" will exceed `maxLineLength`
                // thus, we have to end the current line and continue on a new one
                // for this, we introduce a "soft line break"
                encodeQuotedPrintableSoftLineBreak(this);
                currentLineLength = 0;
              }

              this.uint8(0x3d /* = */);
              this.uint8(numberToSingleAlphanumeric(byte >> 4, true));
              this.uint8(numberToSingleAlphanumeric(byte & 0x0f, true));

              currentLineLength += 3;
            }

            break;
          }
        }

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

/* FUNCTIONS */

function encodeQuotedPrintableLineBreak(encoder: Encoder): void {
  encoder.uint8(0x0d /* \r */);
  encoder.uint8(0x0a /* \n */);
}

function encodeQuotedPrintableSoftLineBreak(encoder: Encoder): void {
  encoder.uint8(0x3d /* = */);
  encodeQuotedPrintableLineBreak(encoder);
}
