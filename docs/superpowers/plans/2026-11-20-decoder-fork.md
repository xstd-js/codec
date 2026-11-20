# Decoder.fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Decoder.fork(length, decode)` — atomic bounded sub-decoding — with a 5-test net.

**Architecture:** One public method on `Decoder`, reusing the existing constructor over a `subarray` window, `complete()` enforcement, and a direct cursor advance; no new state.

**Tech Stack:** TypeScript (ESM), vitest, prettier.

**Spec:** `docs/superpowers/specs/2026-11-20-decoder-fork-design.md`

## Global Constraints

- Engine floor: Chrome/Edge ≥ 135, Safari ≥ 18.2, Firefox ≥ 134, Node ≥ 24.
- Repo conventions: dash-cased files/folders; one `.ts` file per folder; no barrels; no default exports; private `#fields`; generics `G`-prefixed; `readonly` in types.
- Verification: `yarn fb:test`, `yarn fb:check:types`, `npx prettier --write --config .prettierrc <files>`.
- Test count: 184 → 189 (+5, one commit).

## Review Focus

- `fork` where `length > remaining` — expect `Error('Size limit reached.')` BEFORE the child runs, parent untouched (the `subarray` clamp must never let the parent cursor overflow). Pinned by Task 1's over-read test.
- Child failure (incomplete window or throwing `decode`) must leave the parent cursor untouched. Pinned by Task 1's incomplete-child test (asserting `consumed`/`remaining` after the throw).
- Child over-consumption beyond its window is impossible by construction (child's own `#consume` throws) — no test needed; the window is enforced by the child, not the parent.

---

### Task 1: Decoder.fork

**Files:**
- Modify: `src/decoder/decoder.ts` (method placed after the instance `decode()`, ~line 140)
- Test: `src/decoder/decoder.test.ts` (new `describe('fork')` inside `describe('Decoder') > methods`, after the instance `decode` describe)

**Interfaces:**
- Consumes: `DecodeFunction` (already imported), constructor, `complete()`, `remaining` getter.
- Produces: `fork<GReturn>(length: number, decode: DecodeFunction<GReturn>): GReturn`.

- [ ] **Step 1: Write the 5 failing tests**

```ts
describe('fork', () => {
  test('decodes a bounded window and advances this Decoder', () => {
    const decoder = new Decoder(new Uint8Array([0x03, 0x61, 0x62, 0x63, 0xff]));
    expect(decoder.uint8()).toBe(3);
    expect(decoder.fork(3, (d: Decoder): string => d.string(3, { encoding: 'binary' }))).toBe(
      'abc',
    );
    expect(decoder.consumed).toBe(4);
    expect(decoder.remaining).toBe(1);
  });

  test('leaves this Decoder untouched when the child is incomplete', () => {
    const decoder = new Decoder(new Uint8Array([0x02, 0x61, 0xff]));
    decoder.uint8();
    expect(() => decoder.fork(2, (d: Decoder): number => d.uint8())).toThrow(
      '1 bytes remaining.',
    );
    expect(decoder.consumed).toBe(1);
    expect(decoder.remaining).toBe(2);
  });

  test('supports a zero-length window', () => {
    const decoder = new Decoder(new Uint8Array([0x01]));
    expect(decoder.fork(0, (d: Decoder): number => d.remaining)).toBe(0);
    expect(decoder.consumed).toBe(0);
  });

  test('rejects invalid lengths', () => {
    const decoder = new Decoder(new Uint8Array([1]));
    expect(() => decoder.fork(-1, () => undefined)).toThrow(RangeError);
    expect(() => decoder.fork(1.5, () => undefined)).toThrow(RangeError);
  });

  test('rejects over-reads before running the child', () => {
    const decoder = new Decoder(new Uint8Array([1, 2]));
    expect(() => decoder.fork(3, () => undefined)).toThrow('Size limit reached.');
    expect(decoder.consumed).toBe(0);
  });
});
```

- [ ] **Step 2: Run — Expected: FAIL** (method does not exist)

Run: `yarn vitest run src/decoder/decoder.test.ts`
Expected: FAIL (TS compile error on `fork`)

- [ ] **Step 3: Implement `fork`** after the instance `decode()` method:

```ts
fork<GReturn>(length: number, decode: DecodeFunction<GReturn>): GReturn {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError(`Invalid length: ${length}.`);
  }

  if (length > this.remaining) {
    throw new Error('Size limit reached.');
  }

  const child: Decoder = new Decoder(this.#bytes.subarray(this.#cursor, this.#cursor + length));
  const result: GReturn = decode(child);
  child.complete();

  this.#cursor += length;

  return result;
}
```

With JSDoc stating the contract: bounded child over a live subarray (point-8
aliasing wording), child must consume its whole window, parent advances by
exactly `length` and stays untouched on any failure.

- [ ] **Step 4: Run — Expected: PASS** — `yarn fb:test` → 189 passed; `yarn fb:check:types` → exit 0; prettier --write on touched files.

- [ ] **Step 5: Commit**

```bash
git add src/decoder
git commit -m "feat: add Decoder.fork for bounded sub-decoding"
```
