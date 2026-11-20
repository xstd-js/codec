# Drop the float16 fallback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hand-written float16 conversion (`functions.private/f16`) and call the native `DataView.getFloat16/setFloat16` directly, setting the engine floor to 2025+ browsers/runtimes.

**Architecture:** Pure removal plus simplification of two private methods. No public API change; behavior on the new floor is unchanged (the native path was already taken on modern engines).

**Tech Stack:** TypeScript (ESM), vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-drop-f16-fallback-design.md`

## Global Constraints

- Engine floor: engines with native `DataView.getFloat16/setFloat16` (Chrome/Edge 135+, Safari 18.2+, Firefox 134+, Node 24+).
- Code style (repo AGENTS.md): dash-cased folders, one `.ts` file per folder, no barrels, no default exports, private `#fields`, `G`-prefixed generics.
- No other modernization rides along (spec non-goal).
- Test commands: `yarn fb:test` (full suite), `yarn fb:check:types`.

## Review Focus

- No leftover reference to `set_float_16` / `get_float_16` / `f16` imports anywhere in `src/` — pinned by the grep step in Task 1.
- `functions.private/shared-data-view` must remain untouched (used by `uint-x`/`int-x`) — pinned by the full suite in Task 1.
- No RED test exists for a removal (dead-code deletion); the safety net is the existing suite staying green (216→218 float16 tests already exercise the native path on this runtime) and the type check — per the approved spec.

---

### Task 1: Call native float16 directly, delete `functions.private/f16`

**Files:**
- Modify: `src/encoder/encoder.ts` (`#float16`, around lines 292-301)
- Modify: `src/decoder/decoder.ts` (`#float16`, around lines 216-224)
- Delete: `src/functions.private/f16/` (4 files: `set_float_16/set_float_16.ts`, `set_float_16/set_float_16.test.ts`, `get_float_16/get_float_16.ts`, `get_float_16/get_float_16.test.ts`)
- Test: existing `src/encoder/encoder.test.ts` (`describe('float16')`) and `src/decoder/decoder.test.ts` (`describe('float16')`) — no changes.

**Interfaces:**
- Consumes: native `DataView.prototype.setFloat16/getFloat16` (engine floor).
- Produces: `Encoder.#float16(value: number, littleEndian: boolean): this` and `Decoder.#float16(littleEndian: boolean): number` — same signatures as today, no fallback branch.

- [ ] **Step 1: Confirm nothing else imports the f16 helpers**

Run: `grep -rn "set_float_16\|get_float_16" src/ --include='*.ts' | grep -v 'src/functions.private/f16'`
Expected: exactly two hits — the imports in `src/encoder/encoder.ts` and `src/decoder/decoder.ts`.

- [ ] **Step 2: Simplify `Encoder.#float16`**

Replace the guard + fallback branch with a single native call; keep the method signature and the `return this` contract:

```ts
#float16(value: number, littleEndian: boolean): this {
  this.#view.setFloat16(this.#alloc(2), value, littleEndian);
  return this;
}
```

Remove the now-unused `import { set_float_16 } ...` line.

- [ ] **Step 3: Simplify `Decoder.#float16`**

```ts
#float16(littleEndian: boolean): number {
  return this.#view.getFloat16(this.#consume(2), littleEndian);
}
```

Remove the now-unused `import { get_float_16 } ...` line.

- [ ] **Step 4: Delete the f16 folder**

Run: `git rm -r src/functions.private/f16`
Expected: 4 files deleted.

- [ ] **Step 5: Verify**

Run: `yarn fb:test && yarn fb:check:types`
Expected: all test files pass (the float16 tests already run the native path on this runtime), type check exits 0.

Run: `grep -rn "set_float_16\|get_float_16\|functions.private/f16" src/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add src/encoder/encoder.ts src/decoder/decoder.ts
git commit -m "refactor!: require engines with native float16 DataView methods"
```

### Task 2: Document the engine floor in README

**Files:**
- Modify: `README.md` (add a section; do not touch the « Documentation » link the user is editing)

**Interfaces:**
- Produces: a « Requirements » section naming the engine floor.

- [ ] **Step 1: Add the section after « Installation »**

```markdown
## ✅ Requirements

Engines with native `DataView.getFloat16`/`setFloat16`:
Chrome/Edge ≥ 135, Safari ≥ 18.2, Firefox ≥ 134, Node.js ≥ 24.
```

- [ ] **Step 2: Verify**

Run: `yarn fb:test`
Expected: still green (README is not imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: state the engine floor in README"
```
