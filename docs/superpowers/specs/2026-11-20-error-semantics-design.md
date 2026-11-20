# Design — Error semantics (point 4)

Date: 2026-11-20
Status: approved

## Intent

Settle the library's error semantics before v1.0.0: plain errors with
uniform messages as a tested contract, strict constructor validation,
documented integer-wrap semantics, and a readonly-until-done contract on
Decoder views.

## Approaches considered

- **(a) Typed error hierarchy** (`CodecError` → `SizeLimitError`…) — rejected:
  public surface for a hypothetical need; the messages are already uniform
  (« Size limit reached. », « Invalid size/length: … », « N bytes remaining. »)
  and pinned by tests; subclassing later is non-breaking.
- **(b) Keep silent clamping** of `EncoderOptions` — rejected: a reasonable
  person passing an invalid byte length expects a clear rejection, not a
  magic correction (standard of the genre: `Buffer.alloc` throws). Auto-raising
  `maxByteLength < initialByteLength` rejected for the same reason.
- **(c) Throw on positive out-of-range writes, keep negative wrap** — rejected:
  asymmetric; the two's-complement wrap IS the feature that makes
  `int24LE(-1)` → `0xffffff` work (`BigInt.asUintN`). Uniform DataView wrap in
  both directions, documented, is the coherent contract.
- **(d) Type-level `Readonly<Uint8Array>`** — rejected: heavy, breaking, and
  TypeScript cannot truly strip mutation methods from `Uint8Array`; the
  request is a documented contract.

## Changes

1. **(b) `fix!:` strict `Encoder` constructor validation** — the silent
   `Math.max/min/floor` clamping is removed:
   - `initialByteLength`: safe integer in `[0, 0x100000000]`, else
     `RangeError('Invalid initialByteLength: …')`.
   - `maxByteLength`: safe integer in `[initialByteLength, 0x100000000]`, else
     `RangeError('Invalid maxByteLength: …')`.
   - `EncoderOptions` JSDoc updated (ranges become enforced contracts).
   - Migration: pass valid integers (previously accepted inputs -1, 0.5,
     `max < initial` now throw).
2. **(c) `test:` integer-wrap semantics pinned + documented** — one INFO line
   in the Encoder class block: integer writes use DataView semantics, values
   wrap modulo 2^bits (two's complement for negatives). Pins:
   `uint8(300)` → `0x2c` · `uint32LE(2**32 + 5)` → `[5, 0, 0, 0]` ·
   `int8(128)` → `0x80` · `int16LE(70000)` → `[0x70, 0x11]`.
3. **(d) `docs:` readonly-until-done contract** — class-level rule on
   `Decoder`: until the Decoder is `done`, the source bytes and every view it
   returned must be treated as readonly — no mutation of the source, of
   `bytes()` results, of `toUint8Array()` results, or of `fork()` windows —
   so that no data changes on the fly during reads. One-line reminders on
   `bytes()` and `toUint8Array()`. After `done`, mutation is safe (no reads
   remain).

## Calls made

- `maxByteLength < initialByteLength` throws instead of being auto-raised
  (the old clamp raised it silently).
- Wrap pins are characterization tests (the behavior exists today); the
  constructor tests are true regression gates (RED before the fix).
- No README change rides along (the Documentation section is still the
  partner's TODO).

## Non-goals

- No error classes, no `code` field, no `cause` plumbing.
- No type-level readonly views, no frozen buffers.

## Safety net

Full test suite + `fb:check:types` + prettier. 190 → 194 (+2 constructor
rejection tests, +2 wrap pins).
