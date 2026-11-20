[![npm (scoped)](https://img.shields.io/npm/v/@xstd/codec.svg)](https://www.npmjs.com/package/@xstd/codec)
![npm](https://img.shields.io/npm/dm/@xstd/codec.svg)
![NPM](https://img.shields.io/npm/l/@xstd/codec.svg)
![npm type definitions](https://img.shields.io/npm/types/@xstd/codec.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-green)

<picture>
  <source height="64" media="(prefers-color-scheme: dark)" srcset="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-dark.png?raw=true">
  <source height="64" media="(prefers-color-scheme: light)" srcset="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-light.png?raw=true">
  <img height="64" alt="Shows a black logo in light color mode and a white one in dark color mode." src="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-light.png?raw=true">
</picture>

## @xstd/codec

Transform any value into bytes and back: an `Encoder` and a `Decoder` for numbers, strings and
JSON, with chainable streaming converters (base64, hex, quoted-printable).

## 📦 Installation

```shell
yarn add @xstd/codec
# or
npm install @xstd/codec --save
```

## ✅ Requirements

Engines with native `DataView.getFloat16`/`setFloat16`:
Chrome/Edge ≥ 135, Safari ≥ 18.2, Firefox ≥ 134, Node.js ≥ 24.

## 📜 Documentation

### Encoding

An `Encoder` writes values into an internal growable buffer, one method call at a time:

```ts
import { Encoder } from '@xstd/codec';

const bytes: Uint8Array = new Encoder()
  .int16LE(3) // length prefix
  .string('abc', { encoding: 'binary' }) // payload
  .toUint8Array();

// bytes => [3, 0, 97, 98, 99]
```

Numbers are written through explicit _little-endian_ / _big-endian_ method pairs:
`int8`, `int16LE`/`int16BE`, `int24LE`/`int24BE`, `int32LE`/`int32BE`, `int40`…`int64` — and
their `uint*` and `float16`/`float32`/`float64` counterparts. The extra widths (`24`/`40`/`48`
bits) take `number`s, while `56` and `64` bits take `bigint | number`.

One-shot statics:

```ts
Encoder.string('abc'); // UTF-8 bytes
Encoder.json({ a: 1 }); // JSON.stringify(...) as UTF-8 bytes
```

Custom encoding functions compose through `encode` and `iterable`:

```ts
import { Encoder, type EncodeFunction } from '@xstd/codec';

const encodePair: EncodeFunction<[string, number]> = (encoder, [str, n]): void => {
  encoder.string(str, { encoding: 'utf-8' }).uint8(n);
};

const bytes: Uint8Array = new Encoder()
  .encode(['a', 1], encodePair)
  .iterable(
    [
      ['b', 2],
      ['c', 3],
    ],
    encodePair,
  )
  .toUint8Array();
```

### Decoding

A `Decoder` reads bytes strictly forward — reads are the only cursor moves:

```ts
import { Decoder } from '@xstd/codec';

const str: string = Decoder.decode(new Uint8Array([3, 0, 97, 98, 99]), (decoder) => {
  const length: number = decoder.int16LE(); // decodes the string's length
  return decoder.string(length, { encoding: 'binary' }); // decodes the string as binary
});

// str => 'abc'
```

`fork` decodes a bounded window with a child `Decoder`, atomically:

```ts
const value: Value = decoder.fork(byteLength, (child) => parseValue(child));
// the parent cursor advances by exactly `byteLength` on success,
// and is left untouched on any failure.
```

### Converters

Converters are streaming transducers reading from a `Decoder` and writing into an `Encoder`,
so any encoding can be chained into any other — for example, turning a base64 string into a
quoted-printable string:

```ts
import {
  convertBase64StringToBytes,
  convertBytesToQuotedPrintableString,
  Decoder,
  Encoder,
} from '@xstd/codec';

const base64: string = 'SGVsbG8=';

const quotedPrintable: string = Decoder.string(
  convertBytesToQuotedPrintableString(
    convertBase64StringToBytes(new Encoder().string(base64).toDecoder(), new Encoder()).toDecoder(),
    new Encoder(),
  ).toUint8Array(),
  { encoding: 'binary' },
);
```

### Contracts

- **Forward-only `Decoder`** — reads are the only cursor moves; use `fork` for bounded
  sub-decoding, and `new Decoder(...)` over the remaining bytes to re-parse.
- **Atomic writes** — a failed write throws before moving the cursor, leaving `length`
  unchanged; only `string({ encoding: 'binary' })` may leave partial bytes behind
  (characters are validated mid-write).
- **Integer wrap** — integer writes use `DataView` semantics: values wrap modulo `2^bits`
  (two's complement for negatives).
- **Readonly views** — until a `Decoder` is `done`, its source bytes and every `Uint8Array`
  it returned must be treated as readonly.
- **Explicit endianness** — no implicit byte order anywhere: every multi-byte read/write is
  an explicit `_LE_`/`_BE_` pair.
- **Uniform errors** — plain `Error`/`RangeError` with pinned messages (`Size limit reached.`,
  `Invalid size: …`, `N bytes remaining.`); invalid `Encoder` byte length options are rejected
  with a `RangeError` instead of being silently clamped.
