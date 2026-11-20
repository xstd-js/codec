# Design — Decoder.fork (bounded sub-decoding)

Date: 2026-11-20
Status: approved

## Intent

Decode a bounded sub-structure (TLV value, framed packet) with a child Decoder
guaranteed to see exactly `length` bytes — without introducing any
non-read cursor movement on the parent.

## Approaches considered

- **A+B. `mark()`/`reset()` backtracking (implicit or token-based)** — dropped
  by partner decision: the Decoder's contract is forward-only auto-increment;
  a second, read-less way to move the cursor weakens the invariant that makes
  the class predictable (partner: « usage douteux »).
- **C. Raw `cursor`/`seek()` setter** — rejected: same invariant break, plus
  invites arbitrary jumps.
- **E. `fork(length): Decoder` view** (the old commented sketch) — rejected:
  parent never advances, caller manages the cursor manually.
- **D (picked): functional bounded decode** — child Decoder over a `length`
  window, `decode` runs on it, child must complete, parent advances by
  exactly `length`; atomic on any child failure.
- Lookahead/`peek` — dropped under the same philosophy; may be named later if
  a real need appears.

Escape hatch for genuine re-parse needs, already expressible today:
`new Decoder(decoder.bytes(decoder.remaining))`.

## Changes

1. `Decoder.fork<GReturn>(length: number, decode: DecodeFunction<GReturn>): GReturn`:
   - `length` must be a safe integer ≥ 0, else `RangeError` (`Invalid length: …`);
     `fork(0)` is valid (empty child, immediately complete).
   - `length > remaining` → `Error('Size limit reached.')` before anything runs
     (fail fast; prevents the `subarray` clamp from letting the parent cursor
     overflow).
   - Child = `new Decoder(this.#bytes.subarray(cursor, cursor + length))` —
     a live subarray: the point-8 aliasing semantics apply.
   - `decode(child)` runs; then `child.complete()` enforces full consumption
     (same message as `static decode`). Any child failure leaves the parent
     cursor untouched (atomicity).
   - Parent advances by exactly `length` after success.
2. Placement: after the instance `decode()` method (functional helpers group).

## Calls made

- Full-consumption enforcement on the child (strict, like `static decode`)
  rather than silently ignoring unread window bytes.
- Two error classes, mirroring `#consume`: `RangeError` for invalid lengths,
  plain `Error('Size limit reached.')` for over-reads.

## Non-goals

- No `mark`/`reset`/`seek`/`peek` (philosophy: reads are the only cursor moves).
- No re-entrant/async fork.

## Safety net

Full test suite + `fb:check:types` + prettier. 5 new tests: TLV round-trip
(parent advanced by 1+length, rest intact) · incomplete child → throw + parent
untouched · `fork(0)` · invalid lengths → RangeError · over-read → parent
untouched. 184 → 189.
