# Extra numeric widths as LE+BE methods — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 16 standalone 24/40/48/56-bit codec functions with 32 `Encoder`/`Decoder` methods (`…LE`/`…BE`), delegating to the existing `*.private` width-parameterized functions.

**Architecture:** Pure API swap: methods on the two classes delegate to `encode{Uint,Int}X{LE,BE}` / `decode{Uint,Int}X{LE,BE}`; the public per-width function folders are deleted; `*.private` implementations and tests stay.

**Tech Stack:** TypeScript (ESM), vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-extra-width-methods-design.md`

## Global Constraints

- Code style (repo AGENTS.md): dash-cased folders, one `.ts` file per folder, no barrels, no default exports, private `#fields`, `G`-prefixed generics.
- Types: `number` for ≤ 48-bit widths; `bigint | number` (encode) and `bigint` (decode) for 56.
- Test commands: `yarn fb:test`, `yarn fb:check:types` (run as separate `task-done` args — the script passes them to `"$@"` without a shell).
- One atomic `feat!:` commit for the whole swap (spec call).

## Review Focus

- The 16 deleted function folders must leave NO dangling import anywhere in `src/` — pinned by the grep step in Task 2.
- 56-bit methods must keep the `bigint`/`bigint | number` types (not `number`) — pinned by the type check and the test assertions using `bigint` literals (`n` suffix).
- Decoder methods must consume exactly their width in bytes (24-bit → 3 bytes consumed) — pinned by `expect(decoder.consumed).toBe(…)` assertions.
- Sign extension: the `int*` decoder methods return negative `bigint`/`number` for two's-complement inputs — pinned by dedicated assertions in the decoder tests.

---

### Task 1: Encoder methods (16) with tests

**Files:**
- Modify: `src/encoder/encoder.ts` (add 16 methods after `uint64BE`, before `#float16`; add imports of `encodeUintXLE/BE`, `encodeIntXLE/BE` from `./extra/number/{unsigned,signed}/{uint,int}-x.private/…`)
- Modify: `src/encoder/encoder.test.ts` (add `describe('extra widths')` with 16 tests)
- Delete: the 8 encoder wrapper folders `src/encoder/extra/number/{unsigned,signed}/{uint24,uint40,uint48,uint56,int24,int40,int48,int56}/encode-*-l-e/` (each contains `encode-*.ts` + `encode-*.test.ts`)

**Interfaces:**
- Consumes: `encodeUintXLE(encoder: Encoder, input: bigint | number, bytes: number): void`, `encodeUintXBE(…)`, `encodeIntXLE(…)`, `encodeIntXBE(…)` — unchanged signatures from `*.private`.
- Produces: the 16 `Encoder` methods listed in the spec, each returning `this`.

- [ ] **Step 1: Write the failing tests**

Add to `src/encoder/encoder.test.ts`, after the `uint64` describe:

```ts
describe('extra widths', () => {
  test('uint24LE', () => {
    expect(new Encoder().uint24LE(0x123456).toUint8Array()).toEqual(new Uint8Array([0x56, 0x34, 0x12]));
    expect(new Encoder().uint24LE(0x123456).length).toBe(3);
  });
  test('uint24BE', () => {
    expect(new Encoder().uint24BE(0x123456).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
  });
  test('uint40LE', () => {
    expect(new Encoder().uint40LE(0x1234567890).toUint8Array()).toEqual(new Uint8Array([0x90, 0x78, 0x56, 0x34, 0x12]));
  });
  test('uint40BE', () => {
    expect(new Encoder().uint40BE(0x1234567890).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90]));
  });
  test('uint48LE', () => {
    expect(new Encoder().uint48LE(0x1234567890ab).toUint8Array()).toEqual(new Uint8Array([0xab, 0x90, 0x78, 0x56, 0x34, 0x12]));
  });
  test('uint48BE', () => {
    expect(new Encoder().uint48BE(0x1234567890ab).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]));
  });
  test('uint56LE', () => {
    expect(new Encoder().uint56LE(0x1234567890abcdn).toUint8Array()).toEqual(new Uint8Array([0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12]));
  });
  test('uint56BE', () => {
    expect(new Encoder().uint56BE(0x1234567890abcdn).toUint8Array()).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd]));
  });
  test('int24LE', () => {
    expect(new Encoder().int24LE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff]));
    expect(new Encoder().int24LE(0x123456).toUint8Array()).toEqual(new Uint8Array([0x56, 0x34, 0x12]));
  });
  test('int24BE', () => {
    expect(new Encoder().int24BE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff]));
  });
  test('int40LE', () => {
    expect(new Encoder().int40LE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]));
  });
  test('int40BE', () => {
    expect(new Encoder().int40BE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]));
  });
  test('int48LE', () => {
    expect(new Encoder().int48LE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
  });
  test('int48BE', () => {
    expect(new Encoder().int48BE(-1).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
  });
  test('int56LE', () => {
    expect(new Encoder().int56LE(-1n).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
  });
  test('int56BE', () => {
    expect(new Encoder().int56BE(-1n).toUint8Array()).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/encoder/encoder.test.ts`
Expected: FAIL — `encoder.uint24LE is not a function` (16 failures, all existing tests pass).

- [ ] **Step 3: Implement the 16 methods in `src/encoder/encoder.ts`**

After `uint64BE`, one-line JSDoc each (« Writes a `uint24` as little-endian… » style). Each delegates to the `*.private` function with the width in hard:

```ts
/**
 * Writes a `uint24` represented as _little-endian_ in this Encoder.
 */
uint24LE(value: number): this {
  encodeUintXLE(this, value, 3);
  return this;
}
```

Widths: 24 → 3, 40 → 5, 48 → 6, 56 → 7. `uint56*`/`int56*` take `value: bigint | number`. Imports from:

- `./extra/number/unsigned/uint-x.private/encode-uint-x-l-e/encode-uint-x-l-e.js` (+ `-b-e`)
- `./extra/number/signed/int-x.private/encode-int-x-l-e/encode-int-x-l-e.js` (+ `-b-e`)

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/encoder/encoder.test.ts`
Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Delete the 8 encoder wrapper folders**

Run: `git rm -r src/encoder/extra/number/unsigned/uint24 src/encoder/extra/number/unsigned/uint40 src/encoder/extra/number/unsigned/uint48 src/encoder/extra/number/unsigned/uint56 src/encoder/extra/number/signed/int24 src/encoder/extra/number/signed/int40 src/encoder/extra/number/signed/int48 src/encoder/extra/number/signed/int56`

Note: this removes the LE encoder wrappers AND their tests; the decoder wrapper folders (same paths on the decoder side) are NOT touched here.

- [ ] **Step 6: Verify no dangling references**

Run: `yarn fb:test && yarn fb:check:types` (separately for task-done later); grep:
`grep -rn "encode-uint24\|encode-uint40\|encode-uint48\|encode-uint56\|encode-int24\|encode-int40\|encode-int48\|encode-int56" src/ | grep -v '\.private/' || echo clean`
Expected: `clean` (only `*.private` internals may match nothing at all).

- [ ] **Step 7: Commit (task-level — will be amended into the atomic commit in Task 3)**

```bash
git add -A src/encoder
git commit -m "wip: encoder extra-width methods"
```

### Task 2: Decoder methods (16) with tests

**Files:**
- Modify: `src/decoder/decoder.ts` (add 16 methods after `uint64BE`, before `#float16`; imports of `decodeUintXLE/BE`, `decodeIntXLE/BE`)
- Modify: `src/decoder/decoder.test.ts` (add `describe('extra widths')` with 16 tests)
- Delete: the 8 decoder wrapper folders `src/decoder/extra/number/{unsigned,signed}/{uint24,uint40,uint48,uint56,int24,int40,int48,int56}/decode-*-l-e/` (source files only — no test files exist there)

**Interfaces:**
- Consumes: `decodeUintXLE(decoder: Decoder, bytes: number): bigint`, `decodeUintXBE(…)`, `decodeIntXLE(…)`, `decodeIntXBE(…)`.
- Produces: the 16 `Decoder` methods (returns `number` ≤ 48, `bigint` for 56).

- [ ] **Step 1: Write the failing tests**

Add to `src/decoder/decoder.test.ts`, after the `uint64` describe:

```ts
describe('extra widths', () => {
  test('uint24LE', () => {
    const decoder = new Decoder(new Uint8Array([0x56, 0x34, 0x12]));
    expect(decoder.uint24LE()).toBe(0x123456);
    expect(decoder.consumed).toBe(3);
  });
  test('uint24BE', () => {
    expect(new Decoder(new Uint8Array([0x12, 0x34, 0x56])).uint24BE()).toBe(0x123456);
  });
  test('uint40LE', () => {
    expect(new Decoder(new Uint8Array([0x90, 0x78, 0x56, 0x34, 0x12])).uint40LE()).toBe(0x1234567890);
  });
  test('uint40BE', () => {
    expect(new Decoder(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90])).uint40BE()).toBe(0x1234567890);
  });
  test('uint48LE', () => {
    expect(new Decoder(new Uint8Array([0xab, 0x90, 0x78, 0x56, 0x34, 0x12])).uint48LE()).toBe(0x1234567890ab);
  });
  test('uint48BE', () => {
    expect(new Decoder(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab])).uint48BE()).toBe(0x1234567890ab);
  });
  test('uint56LE', () => {
    expect(new Decoder(new Uint8Array([0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12])).uint56LE()).toBe(0x1234567890abcdn);
  });
  test('uint56BE', () => {
    expect(new Decoder(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd])).uint56BE()).toBe(0x1234567890abcdn);
  });
  test('int24LE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff])).int24LE()).toBe(-1);
  });
  test('int24BE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff])).int24BE()).toBe(-1);
  });
  test('int40LE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])).int40LE()).toBe(-1);
  });
  test('int40BE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])).int40BE()).toBe(-1);
  });
  test('int48LE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])).int48LE()).toBe(-1);
  });
  test('int48BE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])).int48BE()).toBe(-1);
  });
  test('int56LE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])).int56LE()).toBe(-1n);
  });
  test('int56BE', () => {
    expect(new Decoder(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])).int56BE()).toBe(-1n);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/decoder/decoder.test.ts`
Expected: FAIL — `decoder.uint24LE is not a function` (16 failures, all existing tests pass).

- [ ] **Step 3: Implement the 16 methods in `src/decoder/decoder.ts`**

Same pattern, one-line JSDoc each:

```ts
/**
 * Reads a `uint24` represented as _little-endian_ from this Decoder.
 */
uint24LE(): number {
  return Number(decodeUintXLE(this, 3));
}
```

`uint56*` return `decodeUintX(this, 7)` directly (bigint); `int24/40/48*` wrap with `Number(...)`; `int56*` return the bigint directly. Widths: 3 / 5 / 6 / 7.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/decoder/decoder.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Delete the 8 decoder wrapper folders**

Run: `git rm -r src/decoder/extra/number/unsigned/uint24 src/decoder/extra/number/unsigned/uint40 src/decoder/extra/number/unsigned/uint48 src/decoder/extra/number/unsigned/uint56 src/decoder/extra/number/signed/int24 src/decoder/extra/number/signed/int40 src/decoder/extra/number/signed/int48 src/decoder/extra/number/signed/int56`

- [ ] **Step 6: Verify**

Run: `yarn fb:test` then `yarn fb:check:types`
Expected: all green, types exit 0.

- [ ] **Step 7: Commit (task-level)**

```bash
git add -A src/decoder
git commit -m "wip: decoder extra-width methods"
```

### Task 3: Atomic swap commit + final verification

**Files:**
- Modify: git history only (the two `wip:` commits become the single `feat!:` commit)

**Interfaces:**
- Consumes: Tasks 1 and 2 complete.

- [ ] **Step 1: Squash the two wip commits into the atomic API-swap commit**

At this point history is: …spec-commit → wip-encoder → wip-decoder (HEAD). Verify with `git log --oneline -4` (if not, STOP and rule). Then:

```bash
git reset --soft HEAD~2
git commit -m "feat!: replace extra-width codec functions with LE+BE Encoder/Decoder methods"
```

- [ ] **Step 2: Final verification**

Run: `yarn fb:test` then `yarn fb:check:types`
Expected: all green (227 tests expected: 195 + 32), types exit 0.

Run: `grep -rn "encode-uint24\|encode-uint40\|encode-uint48\|encode-uint56\|encode-int24\|encode-int40\|encode-int48\|encode-int56\|decode-uint24\|decode-uint40\|decode-uint48\|decode-uint56\|decode-int24\|decode-int40\|decode-int48\|decode-int56" src/ || echo clean`
Expected: `clean`.

- [ ] **Step 3: Commit the plan document**

```bash
git add docs/superpowers/plans/2026-11-20-extra-width-methods.md
git commit -m "docs: add implementation plan for extra-width methods"
```
