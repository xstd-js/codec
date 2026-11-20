# Encoder/Decoder Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the four approved polish points (7, 8a, 9, 10) as five green commits: atomic multi-byte writes without the shared scratch, documented view semantics, delegating static sugar, dead-draft purge, and the symmetric `Decoder` trio.

**Architecture:** Points 7 and 9 rewrite internals of the existing `Encoder`/`Decoder` classes with unchanged public signatures; point 8 is JSDoc-only; point 10 deletes commented drafts and adds three tiny public `Decoder` methods plus a static-refactor that consumes them.

**Tech Stack:** TypeScript (ESM, `.js`-suffixed relative imports), vitest, prettier.

**Spec:** `docs/superpowers/specs/2026-11-20-encoder-decoder-polish-design.md`

## Global Constraints

- Engine floor: Chrome/Edge ≥ 135, Safari ≥ 18.2, Firefox ≥ 134, Node ≥ 24 (native `DataView.getFloat16/setFloat16`).
- Repo conventions: dash-cased files/folders; one `.ts` file per folder (a `constants.private/` folder may group several constant files — existing converters pattern); no barrels; no default exports; private `#fields` (never the `private` keyword); generics `G`-prefixed; `readonly` in types.
- Verification commands: `yarn fb:test` (suite), `yarn fb:check:types` (types), `npx prettier --write --config .prettierrc <files>` (format).
- Every commit is green: full suite + types pass at each commit.
- Test count: 175 → 179 (+1 in Task 1, +3 in Task 5).

## Review Focus

- Multi-byte write when the cursor sits exactly at `maxByteLength` — expect: throw with `length` unchanged and previously written bytes intact. Pinned by Task 1's characterization test (green before and after; guards the new single-alloc loop against reintroducing partial writes).
- All widths × LE/BE × negative values must stay byte-identical to the scratch-based path. Pinned by the existing 175-test suite (Task 1's regression gate; no new test).
- No reference to the deleted scratch may survive anywhere. Pinned by Task 1's grep verification step.
- `string({ encoding: 'binary' })` with an invalid char after valid ones still partially writes (pre-existing, out of scope) — the INFO comment updated in Task 1 keeps documenting it; already pinned by the existing `encoding=binary` invalid-char tests.
- Static `Decoder.json` behavior must not change: the instance call consumes `decoder.remaining`, so `static decode`'s done-check cannot fire. Pinned by the existing `static methods > json` tests (Task 3's regression gate).

---

### Task 1: Atomic multi-byte writes, no shared scratch (point 7)

**Files:**
- Modify: `src/encoder/encoder.ts` (import line 2, INFO block ~155-160, `#encodeUintX` ~214-230)
- Modify: `src/decoder/decoder.ts` (import line 1, `#decodeUintX` ~156-170)
- Delete: `src/functions.private/` (whole tree — `shared-data-view` is its only member)
- Test: `src/encoder/encoder.test.ts` (inside `describe('Encoder') > methods > #alloc`, ~line 43)

**Interfaces:**
- Consumes: nothing new.
- Produces: `#encodeUintX(value: bigint | number, bytes: number, littleEndian: boolean): void` and `#decodeUintX(bytes: number, littleEndian: boolean): bigint` — signatures unchanged, bodies replaced. `#decodeIntX` keeps calling `#decodeUintX` unchanged.

- [ ] **Step 1: Write the characterization test (atomicity pin)**

In `describe('#alloc')`:

```ts
test('size limit reached mid multi-byte write', () => {
  const encoder = new Encoder({ initialByteLength: 4, maxByteLength: 4 });
  encoder.uint32LE(0x12345678);
  expect(() => encoder.uint24LE(0x123456)).toThrow('Size limit reached.');
  expect(encoder.length).toBe(4);
  expect(encoder.toUint8Array()).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
});
```

- [ ] **Step 2: Run the test — Expected: PASS (characterization pin, atomicity already holds per-byte)**

Run: `yarn vitest run src/encoder/encoder.test.ts`
Expected: PASS

- [ ] **Step 3: Replace `Encoder.#encodeUintX` body** — single `#alloc`, BigInt shifts, direct byte writes:

```ts
#encodeUintX(value: bigint | number, bytes: number, littleEndian: boolean): void {
  const start: number = this.#alloc(bytes);
  const packed: bigint = BigInt.asUintN(64, BigInt(value));

  for (let i: number = 0; i < bytes; i++) {
    const shift: bigint = BigInt(littleEndian ? i : bytes - 1 - i) * 8n;
    this.#bytes[start + i] = Number((packed >> shift) & 0xffn);
  }
}
```

Keep the existing NOTE comment about `BigInt.asUintN` making the wrap deterministic.

- [ ] **Step 4: Replace `Decoder.#decodeUintX` body** — single `#consume`, direct byte reads:

```ts
#decodeUintX(bytes: number, littleEndian: boolean): bigint {
  const start: number = this.#consume(bytes);
  let packed: bigint = 0n;

  if (littleEndian) {
    for (let i: number = bytes - 1; i >= 0; i--) {
      packed = (packed << 8n) | BigInt(this.#bytes[start + i]);
    }
  } else {
    for (let i: number = 0; i < bytes; i++) {
      packed = (packed << 8n) | BigInt(this.#bytes[start + i]);
    }
  }

  return packed;
}
```

- [ ] **Step 5: Remove the scratch** — delete both `getShared64bDataView` imports and `git rm -r src/functions.private`

- [ ] **Step 6: Update the INFO block** in `encoder.ts` (~155-160) to stay accurate:

```
   INFO: All the following methods return `this`, enabling us to chain them.
   INFO: Each _write_ moves the `cursor` and grows the encoded bytes.
   INFO: Numeric writes are atomic: if the size limit is reached, the write
         throws before moving the cursor, leaving `length` unchanged.
   INFO: `string({ encoding: 'binary' })` validates characters while writing:
         if it throws, the bytes written so far are left in an unspecified
         state: discard the Encoder instance rather than reusing it.
```

- [ ] **Step 7: Verify** — `yarn fb:test` → 176 passed; `yarn fb:check:types` → exit 0; `grep -rn "getShared64bDataView\|shared-data-view" src/` → no matches; prettier --write on both class files and the test file.

- [ ] **Step 8: Commit**

```bash
git add -A src/
git commit -m "refactor: make multi-byte writes/reads atomic and remove the shared 64-bit scratch"
```

### Task 2: Document view semantics (point 8a)

**Files:**
- Modify: `src/encoder/encoder.ts` (`toUint8Array`, ~147-149)
- Modify: `src/decoder/decoder.ts` (`bytes`, ~429-438)

**Interfaces:**
- Consumes: nothing. Produces: JSDoc only, no signature change.

- [ ] **Step 1: Extend `Encoder.toUint8Array` JSDoc**

```
/**
 * Returns an `Uint8Array` containing the encoded values.
 *
 * > **INFO:** the returned array is a zero-copy view over this Encoder's
 * internal buffer: mutating it mutates the Encoder state, and it retains
 * the whole backing buffer even after the Encoder is discarded.
 */
```

- [ ] **Step 2: Extend `Decoder.bytes` JSDoc**

```
/**
 * Reads an `Uint8Array` from this Decoder.
 *
 * > **INFO:** the returned array is a live subarray of the source bytes:
 * mutations are visible on both sides.
 *
 * @param {number} [length] The length of the bytes to read.
 * @returns {Uint8Array} The read bytes.
 */
```

- [ ] **Step 3: Verify** — `yarn fb:check:types` → exit 0; `yarn fb:test` → 176 passed (unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/encoder/encoder.ts src/decoder/decoder.ts
git commit -m "docs: document the zero-copy view semantics of Encoder.toUint8Array and Decoder.bytes"
```

### Task 3: Static sugar delegates; TextEncoder hoisted (point 9)

**Files:**
- Create: `src/encoder/constants.private/text-encoder.ts`
- Modify: `src/encoder/encoder.ts` (static `json` ~86-92, instance `string` utf-8 path ~582, new import)
- Modify: `src/decoder/decoder.ts` (static `json` ~48-53)

**Interfaces:**
- Consumes: existing instance `Encoder.json`/`Decoder.json`, existing static `Encoder.encode`/`Decoder.decode`.
- Produces: `TEXT_ENCODER: TextEncoder` constant (module-level, `/*#__PURE__*/`-annotated like the old scratch file).

- [ ] **Step 1: Create `src/encoder/constants.private/text-encoder.ts`**

```ts
export const TEXT_ENCODER: TextEncoder = /*#__PURE__*/ new TextEncoder();
```

- [ ] **Step 2: Delegate `Encoder.json` static** (same pattern as the existing static `string`):

```ts
static json(
  value: any,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number,
): Uint8Array {
  return this.encode(value, (encoder: Encoder): void => {
    encoder.json(value, replacer, space);
  });
}
```

- [ ] **Step 3: Use the hoisted encoder** — instance `string`, `utf-8` branch becomes `this.bytes(TEXT_ENCODER.encode(value));` with the import added.

- [ ] **Step 4: Delegate `Decoder.json` static:**

```ts
static json<GValue>(
  bytes: Uint8Array,
  reviver?: (this: any, key: string, value: any) => any,
): GValue {
  return this.decode<GValue>(bytes, (decoder: Decoder): GValue => {
    return decoder.json<GValue>(decoder.remaining, reviver);
  });
}
```

- [ ] **Step 5: Verify** — `yarn fb:test` → 176 passed (static `json` tests are the regression gate); `yarn fb:check:types` → exit 0; prettier --write on touched files.

- [ ] **Step 6: Commit**

```bash
git add src/encoder src/decoder
git commit -m "refactor: delegate static json sugar to instances and hoist the shared TextEncoder"
```

### Task 4: Purge commented-out dead drafts (point 10a)

**Files:**
- Modify: `src/encoder/encoder.ts` (delete the `arrayBufferView` block, ~509-569)
- Modify: `src/decoder/decoder.ts` (delete the `toUint8Array`/`complete`/`decode`/`fork` block ~113-129 and the `iterable` block ~478-498)

**Interfaces:**
- Consumes/Produces: nothing — deletion only. Endianness stays explicit LE/BE (no code change; closes the `#littleEndian` ghost).

- [ ] **Step 1: Delete the three commented blocks** (exact line ranges above).

- [ ] **Step 2: Verify nothing dangling** — `grep -rn "arrayBufferView\|isLittleEndianPlatform\|#littleEndian" src/` → no matches; `yarn fb:test` → 176 passed; `yarn fb:check:types` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/encoder/encoder.ts src/decoder/decoder.ts
git commit -m "chore: remove commented-out dead drafts"
```

### Task 5: Decoder.toUint8Array / complete / decode (point 10b)

**Files:**
- Modify: `src/decoder/decoder.ts` (trio placed after the `done` getter, ~line 111; static `decode` refactor ~27-34)
- Test: `src/decoder/decoder.test.ts` (three describes inside `describe('Decoder') > methods`, after `describe('json')` ~line 540)

**Interfaces:**
- Consumes: existing `done`/`remaining` getters, `DecodeFunction` type (already imported).
- Produces: `Decoder.toUint8Array(): Uint8Array` (view over consumed bytes), `Decoder.complete(): void` (throws when not done), `Decoder.decode<GReturn>(decode: DecodeFunction<GReturn>): GReturn`.

- [ ] **Step 1: Write the three failing tests**

```ts
describe('toUint8Array', () => {
  test('returns a live view over the consumed bytes', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const decoder = new Decoder(bytes);
    decoder.uint16LE();
    const view = decoder.toUint8Array();
    expect(view).toEqual(new Uint8Array([1, 2]));
    view[0] = 9;
    expect(bytes[0]).toBe(9);
  });
});

describe('complete', () => {
  test('throws while bytes remain, passes once done', () => {
    const decoder = new Decoder(new Uint8Array([1, 2]));
    decoder.uint8();
    expect(() => decoder.complete()).toThrow('1 bytes remaining.');
    decoder.uint8();
    expect(() => decoder.complete()).not.toThrow();
  });
});

describe('decode', () => {
  test('decodes with the provided function', () => {
    const decoder = new Decoder(new Uint8Array([1, 2]));
    expect(decoder.decode((d: Decoder): number => d.uint16LE())).toBe(0x0201);
  });
});
```

- [ ] **Step 2: Run — Expected: FAIL** (methods do not exist)

Run: `yarn vitest run src/decoder/decoder.test.ts`
Expected: FAIL (TS compile errors on `toUint8Array`, `complete`, `decode`)

- [ ] **Step 3: Implement the trio** after the `done` getter, with JSDoc; `toUint8Array` JSDoc mirrors the point-8 view-semantics wording:

```ts
toUint8Array(): Uint8Array {
  return new Uint8Array(this.#bytes.buffer, this.#bytes.byteOffset, this.#cursor);
}

complete(): void {
  if (!this.done) {
    throw new Error(`${this.remaining} bytes remaining.`);
  }
}

decode<GReturn>(decode: DecodeFunction<GReturn>): GReturn {
  return decode(this);
}
```

- [ ] **Step 4: Refactor `static decode` to delegate:**

```ts
static decode<GReturn>(bytes: Uint8Array, decode: DecodeFunction<GReturn>): GReturn {
  const decoder: Decoder = new Decoder(bytes);
  const result: GReturn = decoder.decode(decode);
  decoder.complete();
  return result;
}
```

- [ ] **Step 5: Run — Expected: PASS** — `yarn fb:test` → 179 passed; `yarn fb:check:types` → exit 0; prettier --write on touched files.

- [ ] **Step 6: Commit**

```bash
git add src/decoder
git commit -m "feat: add Decoder.toUint8Array, complete and decode"
```
