# Error Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land point 4 as three commits: strict `Encoder` constructor validation (`fix!:`), documented + pinned integer-wrap semantics (`test:`), and the readonly-until-done contract on Decoder views (`docs:`).

**Architecture:** Task 1 replaces silent clamping with range validation; Tasks 2–3 are pins and JSDoc only — no runtime behavior change.

**Tech Stack:** TypeScript (ESM), vitest, prettier.

**Spec:** `docs/superpowers/specs/2026-11-20-error-semantics-design.md`

## Global Constraints

- Engine floor: Chrome/Edge ≥ 135, Safari ≥ 18.2, Firefox ≥ 134, Node ≥ 24.
- Repo conventions: dash-cased files/folders; one `.ts` file per folder; no barrels; no default exports; private `#fields`; generics `G`-prefixed; `readonly` in types.
- Verification: `yarn fb:test`, `yarn fb:check:types`, `npx prettier --write --config .prettierrc <files>`.
- Test count: 190 → 194 (+2 constructor rejections, +2 wrap pins).

## Review Focus

- Constructor validation must accept every previously-valid input the existing tests use (`{1,2}`, `{0,1}`, `{4,4}`, `{5,5}`, defaults) and throw only on out-of-range / non-safe-integer / `max < initial`. Pinned by Task 1 (the existing suite is the acceptance gate).
- The wrap pins must reflect actual `DataView` semantics (`ToUint8/ToInt8/ToInt16/ToUint32` conversions), not aspirational values. Pinned by Task 2 (characterization — values verified against the spec conversions).

---

### Task 1: Strict Encoder constructor validation (point 4b)

**Files:**
- Modify: `src/encoder/encoder.ts` (constructor ~105-115, `EncoderOptions` JSDoc 10-28)
- Test: `src/encoder/encoder.test.ts` (inside `describe('Encoder') > methods > #alloc`… actually constructor scope — new tests at the top of `describe('Encoder')`, before `static methods`, as `describe('constructor')`)

**Interfaces:**
- Consumes: nothing. Produces: constructor throws `RangeError('Invalid initialByteLength: …')` / `RangeError('Invalid maxByteLength: …')` instead of clamping.

- [ ] **Step 1: Write the 2 failing tests** at the top of `describe('Encoder')`:

```ts
describe('constructor', () => {
  test('rejects invalid initialByteLength', () => {
    expect(() => new Encoder({ initialByteLength: -1 })).toThrow(
      'Invalid initialByteLength: -1.',
    );
    expect(() => new Encoder({ initialByteLength: 0.5 })).toThrow(
      'Invalid initialByteLength: 0.5.',
    );
    expect(() => new Encoder({ initialByteLength: 0x100000001 })).toThrow(
      'Invalid initialByteLength: 4294967297.',
    );
    expect(() => new Encoder({ initialByteLength: NaN })).toThrow(
      'Invalid initialByteLength: NaN.',
    );
  });

  test('rejects invalid maxByteLength', () => {
    expect(() => new Encoder({ initialByteLength: 8, maxByteLength: 4 })).toThrow(
      'Invalid maxByteLength: 4.',
    );
    expect(() => new Encoder({ maxByteLength: 0x100000001 })).toThrow(
      'Invalid maxByteLength: 4294967297.',
    );
    expect(() => new Encoder({ maxByteLength: Infinity })).toThrow(
      'Invalid maxByteLength: Infinity.',
    );
  });
});
```

- [ ] **Step 2: Run — Expected: FAIL** (constructor currently clamps instead of throwing)

Run: `yarn vitest run src/encoder/encoder.test.ts`
Expected: FAIL (no throw raised)

- [ ] **Step 3: Implement strict validation** — constructor body becomes:

```ts
constructor({ initialByteLength = 0x100, maxByteLength = 0x100000000 }: EncoderOptions = {}) {
  if (
    !Number.isSafeInteger(initialByteLength) ||
    initialByteLength < 0 ||
    initialByteLength > 0x100000000
  ) {
    throw new RangeError(`Invalid initialByteLength: ${initialByteLength}.`);
  }

  if (
    !Number.isSafeInteger(maxByteLength) ||
    maxByteLength < initialByteLength ||
    maxByteLength > 0x100000000
  ) {
    throw new RangeError(`Invalid maxByteLength: ${maxByteLength}.`);
  }

  this.#buffer = new ArrayBuffer(initialByteLength, {
    maxByteLength,
  });
  this.#view = new DataView(this.#buffer);
  this.#bytes = new Uint8Array(this.#buffer);
  this.#cursor = 0;
}
```

Update `EncoderOptions` JSDoc: state that out-of-range values throw a `RangeError`.

- [ ] **Step 4: Run — Expected: PASS** — full suite (existing `{1,2}`/`{0,1}`/`{4,4}`/`{5,5}` usages stay valid), 192 passed; `yarn fb:check:types` → exit 0; prettier.

- [ ] **Step 5: Commit**

```bash
git add src/encoder
git commit -m "fix!: reject invalid Encoder byte length options instead of clamping"
```

### Task 2: Pin integer-wrap semantics (point 4c)

**Files:**
- Modify: `src/encoder/encoder.ts` (INFO block — one line on wrap semantics)
- Test: `src/encoder/encoder.test.ts` (new `describe('wrapping')` at the end of `describe('numbers')`)

**Interfaces:**
- Consumes/Produces: nothing — characterization pins + one doc line.

- [ ] **Step 1: Write the 2 characterization tests** at the end of `describe('numbers')`:

```ts
describe('wrapping', () => {
  test('wraps unsigned integer writes with DataView semantics', () => {
    expect(new Encoder().uint8(300).toUint8Array()).toEqual(new Uint8Array([0x2c]));
    expect(new Encoder().uint32LE(2 ** 32 + 5).toUint8Array()).toEqual(
      new Uint8Array([0x05, 0x00, 0x00, 0x00]),
    );
  });

  test('wraps signed integer writes with DataView semantics', () => {
    expect(new Encoder().int8(128).toUint8Array()).toEqual(new Uint8Array([0x80]));
    expect(new Encoder().int16LE(70000).toUint8Array()).toEqual(new Uint8Array([0x70, 0x11]));
  });
});
```

- [ ] **Step 2: Run — Expected: PASS** (characterization — the wrap exists today)

Run: `yarn vitest run src/encoder/encoder.test.ts -t wrapping`
Expected: PASS

- [ ] **Step 3: Add one INFO line** to the Encoder class INFO block:

```
     INFO: Integer writes use DataView semantics: values wrap modulo 2^bits
           (two's complement for negatives).
```

- [ ] **Step 4: Run** — 194 passed; types exit 0; prettier.

- [ ] **Step 5: Commit**

```bash
git add src/encoder
git commit -m "test: pin the integer wrapping semantics of numeric writes"
```

### Task 3: Readonly-until-done contract on Decoder views (point 4d)

**Files:**
- Modify: `src/decoder/decoder.ts` (class JSDoc ~5-20, `toUint8Array` JSDoc, `bytes` JSDoc)

**Interfaces:**
- Consumes/Produces: nothing — JSDoc only.

- [ ] **Step 1: Add the class-level rule** to the `Decoder` class JSDoc:

```
 * > **WARNING:** until a Decoder is `done`, the source bytes and every
 * `Uint8Array` it returned must be treated as readonly: do not mutate the
 * source, the results of `bytes()`, `toUint8Array()`, or `fork()` windows,
 * so that no data changes on the fly during reads. Once `done`, mutation
 * is safe.
```

- [ ] **Step 2: Add one-line reminders** — on `toUint8Array()` and `bytes()`: « treat it as readonly while this Decoder is not `done` ».

- [ ] **Step 3: Verify** — 194 passed; types exit 0; prettier.

- [ ] **Step 4: Commit**

```bash
git add src/decoder/decoder.ts
git commit -m "docs: state the readonly-until-done contract on Decoder views"
```
