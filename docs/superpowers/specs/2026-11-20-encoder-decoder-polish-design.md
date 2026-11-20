# Design — Encoder/Decoder polish (points 7, 8a, 9, 10)

Date: 2026-11-20
Status: approved

## Intent

Close four v1.0.0 polish points from the design review, one commit each:

- **7.** Multi-byte writes/reads become atomic and the shared 64-bit scratch
  disappears.
- **8 (option a).** The zero-copy view semantics of `Encoder.toUint8Array()`
  and `Decoder.bytes()` are documented, not changed.
- **9.** Static sugar always delegates to instance methods; the `TextEncoder`
  is no longer rebuilt per call.
- **10.** The never-implemented commented drafts are deleted; the three tiny
  symmetric `Decoder` methods are implemented; explicit LE/BE endianness is
  confirmed as the permanent API.

Partner context: the commented methods were commented out because they
historically never served (simpler alternatives existed, or no practical use).
The three `Decoder` methods below are re-implemented for API
symmetry/completeness at partner approval, despite no proven demand — if they
end up unused again, deleting them later is cheap.

## Approaches considered

### Point 7 — atomic multi-byte writes

- **A (picked).** One `#alloc(bytes)` per logical write; bytes computed with
  BigInt shifts and written/read directly in `this.#bytes`; LE/BE handled by
  loop direction; `functions.private/shared-data-view/` deleted.
- **B.** Keep the shared scratch, single alloc. Rejected: keeps hidden
  module-level mutable state (the thing this point exists to remove).
- **C.** Per-instance scratch field. Rejected: extra memory per instance,
  still a two-phase write.

Guarantee gained: `#alloc` throws *before* any byte is written, so a
limit-reached failure leaves `length` unchanged — the class INFO comment
(« if a write throws, bytes are left in an unspecified state ») narrows
accordingly. This supersedes the f16-design call « shared-data-view stays »:
its consumers (`uint-x`/`int-x`) are class internals now.

### Point 9 — static sugar

- **A (picked).** Statics delegate to instances; hoist one module-level
  `TEXT_ENCODER` (stateless).
- **B.** Keep statics bypassing the classes. Rejected: `static string` already
  delegates; `json` bypassing the machinery is an inconsistency, not a design.
- `TextDecoder` stays per-call: options vary per call, no safe shared
  instance.

### Point 10 — purge vs implement

- **A (picked).** Delete `arrayBufferView` (dead references: `#littleEndian`
  never existed, `isLittleEndianPlatform()` does not exist); implement the
  three tiny `Decoder` methods; migrate `fork` → design point 3 and
  `iterable` → design point 5 (the `iterable` sketch had math bugs in its
  error message — idea kept, code dropped).
- **B.** Implement everything including `fork`/`iterable`. Rejected: they are
  real design points, not mechanical additions.

## Changes

1. **Point 7** — `Encoder.#encodeUintX` / `Decoder.#decodeUintX` rewrite:
   single `#alloc`/`#consume`, direct byte writes/reads with BigInt shifts,
   two's-complement wrap preserved (`BigInt.asUintN(64, …)` NOTE stays);
   `Decoder.#decodeIntX` sign extension unchanged. Delete
   `src/functions.private/shared-data-view/`. New pin test: an `Encoder` at
   its `maxByteLength` throws on a multi-byte write with `length` unchanged.
2. **Point 8** — JSDoc on `Encoder.toUint8Array()` (zero-copy view over the
   internal buffer: mutating it mutates encoder state, whole backing buffer
   retained) and `Decoder.bytes()` (live subarray aliasing the source).
   No code change.
3. **Point 9** — `Encoder.json` static delegates via
   `this.encode(value, (encoder, v) => encoder.json(v, replacer, space))`;
   `Decoder.json` static delegates via `this.decode(bytes, (decoder) =>
   decoder.json(decoder.remaining, reviver))`. New
   `src/encoder/constants.private/text-encoder.ts` hoists the shared
   `TextEncoder` used by instance `string({ encoding: 'utf-8' })`.
4. **Point 10** — delete the two commented blocks (~90 lines); implement
   `Decoder.toUint8Array()` (view over consumed bytes, JSDoc per point 8),
   `Decoder.complete()` (throws `${remaining} bytes remaining.` when not
   done), `Decoder.decode(decode)` (instance counterpart of the static);
   `static Decoder.decode` refactors to `new Decoder(bytes).decode(decode)`
   + `complete()`, same error message. Explicit LE/BE confirmed permanent —
   no code change.

## Calls made

- Point 10 splits in two commits: `chore:` for the purge, `feat:` for the
  three methods + static refactor (new public API, with tests).
- Test count: 175 → 179 (+1 atomicity pin, +3 for the decoder trio).
- No bench work rides along (growth factor and native-base64 questions are
  separate points).

## Non-goals

- No `copy`/`transfer()` variants (option a ratified; revisit on real need).
- No `fork`/`iterable` implementation (queued as design points 3 and 5).
- No converter changes (design point 12, separate instruction).

## Safety net

Full test suite + `fb:check:types` + prettier on touched files.
