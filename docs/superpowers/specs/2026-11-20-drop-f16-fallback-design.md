# Design — Drop the float16 fallback (engine floor « 2025+ »)

Date: 2026-11-20
Status: approved

## Intent

`@xstd/codec` targets engines shipping native `DataView.getFloat16/setFloat16`
(Chrome/Edge 135+, Safari 18.2+, Firefox 134+, Node 24+). The hand-written
float16 conversion becomes dead code and is removed.

## Approaches considered

- **A. Baseline 2024 floor** — keep the resizable-ArrayBuffer requirement and
  the f16 fallback (it still serves engines from the 2023–2025 window).
  Rejected: user chose to be modern.
- **B. Wider floor** (Node 18, Safari < 16.4, Firefox < 127) — add a
  fixed-buffer fallback in `Encoder.#alloc`. Rejected: permanent complexity in
  the hottest path for a shrinking engine share.
- **C. 2025+ floor (picked)** — remove the f16 fallback and its guards
  entirely; the engine is responsible for float16 conversion.

## Changes

1. Delete `src/functions.private/f16/` (`set_float_16.ts`, `get_float_16.ts`
   and both test files, ~190 lines). Subnormal/NaN/Infinity/rounding behavior
   becomes the engine's responsibility — validated bit-exact against the
   native implementation during the 2026-11-20 review.
2. `Encoder.#float16`: drop the `setFloat16 === undefined` guard and the
   fallback branch; call `this.#view.setFloat16(...)` directly. Remove the
   `istanbul ignore` comments.
3. `Decoder.#float16`: same, with `this.#view.getFloat16(...)`.
4. README: add a « Requirements » section stating the engine floor
   (coordinates with the in-flight README edit).
5. Verify `tsconfig` exposes the float16 typings (type check).

## Calls made

- The fallback's edge-case tests (NaN, -0, overflow, subnormals) are NOT
  migrated to the `Encoder`/`Decoder` level: they would test the engine, not
  the library. float16 coverage stays with the 4 existing LE/BE tests.
- One commit for the removal, one for the README.
- `functions.private/shared-data-view` stays (used by `uint-x`/`int-x`).

## Non-goals

- No other modernization rides along.

## Safety net

Full test suite + `fb:check:types`.
