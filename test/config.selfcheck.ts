import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { clearGlobal, clearLocal, DEFAULT_MARKER, DEFAULT_MODE, resolveConfig, writeGlobal, writeLocal } from "../lib/config.ts";

// Each test gets its own sandbox for both the global dir (via XDG_CONFIG_HOME)
// and the project cwd, so runs never touch the real ~/.config or leak into each other.
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "gb-"));
  process.env.XDG_CONFIG_HOME = join(root, "xdg");
  return { cwd: join(root, "proj") };
}
const DIR = ".pi";

test("nothing set -> hardcoded defaults", () => {
  const { cwd } = sandbox();
  assert.deepEqual(resolveConfig(cwd, true, DIR), { mode: { ...DEFAULT_MODE }, marker: DEFAULT_MARKER, hideStatus: false });
});

test("global applies everywhere; local overrides it field by field", () => {
  const { cwd } = sandbox();
  writeGlobal({ mode: { code: true, prose: true, test: false }, marker: "WHY:" });
  writeLocal(cwd, { mode: { code: true, prose: false, test: true }, marker: "NB:" }, DIR);
  // local mode + marker win; global fills nothing extra here
  assert.deepEqual(resolveConfig(cwd, true, DIR), { mode: { code: true, prose: false, test: true }, marker: "NB:", hideStatus: false });
});

test("untrusted project ignores the local file, falls to global", () => {
  const { cwd } = sandbox();
  writeGlobal({ mode: { code: false, prose: true, test: false }, marker: "G:" });
  writeLocal(cwd, { mode: { code: true, prose: true, test: true }, marker: "L:" }, DIR);
  assert.deepEqual(resolveConfig(cwd, false, DIR), { mode: { code: false, prose: true, test: false }, marker: "G:", hideStatus: false });
});

test("empty marker is honored (no prefix), not treated as unset", () => {
  const { cwd } = sandbox();
  writeGlobal({ mode: { ...DEFAULT_MODE }, marker: "WHY:" });
  writeLocal(cwd, { mode: { ...DEFAULT_MODE }, marker: "" }, DIR);
  assert.equal(resolveConfig(cwd, true, DIR).marker, "");
});

test("malformed / BOM-prefixed file reads as unset, never throws", () => {
  const { cwd } = sandbox();
  const p = writeLocal(cwd, { mode: { ...DEFAULT_MODE }, marker: "x" }, DIR);
  writeFileSync(p, "\uFEFF{ not json");
  assert.deepEqual(resolveConfig(cwd, true, DIR), { mode: { ...DEFAULT_MODE }, marker: DEFAULT_MARKER, hideStatus: false });
});

test("reset drops a layer: clear local -> global, clear global -> hardcoded", () => {
  const { cwd } = sandbox();
  writeGlobal({ mode: { code: false, prose: true, test: false }, marker: "G:" });
  writeLocal(cwd, { mode: { code: true, prose: true, test: true }, marker: "L:" }, DIR);
  clearLocal(cwd, DIR);
  assert.equal(resolveConfig(cwd, true, DIR).marker, "G:", "falls to global after local cleared");
  clearGlobal();
  assert.deepEqual(resolveConfig(cwd, true, DIR), { mode: { ...DEFAULT_MODE }, marker: DEFAULT_MARKER, hideStatus: false });
});

test("reset is idempotent: clearing an absent file is a no-op, not an error", () => {
  const { cwd } = sandbox();
  assert.equal(clearLocal(cwd, DIR), false);
  assert.equal(clearGlobal(), false);
});

test("partial mode in a file merges over defaults, keeps the rest", () => {
  const { cwd } = sandbox();
  writeFileSync(writeLocal(cwd, { mode: { ...DEFAULT_MODE }, marker: "x" }, DIR), JSON.stringify({ mode: { prose: true } }));
  assert.deepEqual(resolveConfig(cwd, true, DIR).mode, { code: true, prose: true, test: false });
});

test("hideStatus resolves local over global, defaults false", () => {
  const { cwd } = sandbox();
  assert.equal(resolveConfig(cwd, true, DIR).hideStatus, false);
  writeFileSync(writeLocal(cwd, { mode: { ...DEFAULT_MODE }, marker: "x" }, DIR), JSON.stringify({ hideStatus: true }));
  assert.equal(resolveConfig(cwd, true, DIR).hideStatus, true);
});

test("a snapshot write preserves a hand-edited hideStatus", () => {
  const { cwd } = sandbox();
  const p = writeLocal(cwd, { mode: { ...DEFAULT_MODE }, marker: "x" }, DIR);
  writeFileSync(p, JSON.stringify({ mode: { ...DEFAULT_MODE }, marker: "x", hideStatus: true }));
  writeLocal(cwd, { mode: { code: true, prose: true, test: false }, marker: "y" }, DIR); // like /greybeard default
  const r = resolveConfig(cwd, true, DIR);
  assert.equal(r.hideStatus, true, "hideStatus survived the snapshot write");
  assert.equal(r.marker, "y", "new snapshot still applied");
});
