# Design — Extra numeric widths as LE+BE methods (24/40/48/56)

Date: 2026-11-20
Status: approved

## Intent

The 24/40/48/56-bit widths become first-class methods on `Encoder` and
`Decoder`, symmetrical with the core (`int16LE`, `float64BE`), in BOTH
endiannesses. The standalone free-function codecs are removed — one way to do
things.

## Approaches considered

- **A. Keep free functions, add BE wrappers** (original point 2) — two naming
  conventions coexist, chaining still impossible. Rejected: partner asked for
  methods instead.
- **B. Methods + BE, free functions removed (picked)** — the class becomes the
  single numeric API, matching the core's shape.

## Surface

32 methods delegating to the 8 existing `*.private` width-parameterized
functions (all already tested):

- `Encoder`: `uint24LE/BE(value: number)`, `uint40LE/BE(value: number)`,
  `uint48LE/BE(value: number)`, `uint56LE/BE(value: bigint | number)`,
  `int24LE/BE(value: number)`, `int40LE/BE(value: number)`,
  `int48LE/BE(value: number)`, `int56LE/BE(value: bigint | number)` — all
  return `this`.
- `Decoder`: same names, no argument, returning `number` for ≤ 48-bit widths
  and `bigint` for 56-bit widths.

## Calls made

- The 16 standalone public functions (8 encoder + 8 decoder) are DELETED —
  breaking change, assumed on the pre-1.0 release/v1.0.0 line; single atomic
  `feat!:` commit for the API swap (methods + tests + deletions).
- Types mirror the current wrappers: `number` for ≤ 48-bit widths,
  `bigint | number` for 56 (2^53 boundary).
- Tests at the method level: 16 encoder tests (expected byte arrays, explicit
  style, LE and BE separate) + 16 decoder tests (expected values). The 8
  encoder wrapper test files die with their wrappers; the `*.private` tests
  stay.
- One-line JSDoc per new method (the core is uneven there; normalize on the
  new side).
- No widths added beyond 24/40/48/56; converters untouched.

## Safety net

TDD (RED: `encoder.uint24BE` does not exist → GREEN), full suite +
`fb:check:types`.
