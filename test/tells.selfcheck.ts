import assert from "node:assert/strict";
import { test } from "node:test";
import { findTells } from "../lib/tells.ts";

test("clean prose yields no tells (silence, not a clean signal)", () => {
  assert.deepEqual(findTells("The parser reads 4GB files without loading them into memory."), []);
});

test("em-dash is flagged at rung 1 with its sentence", () => {
  const t = findTells("This one—leaks.");
  assert.deepEqual(t, [{ rung: 1, kind: "em-dash", sentence: "This one—leaks." }]);
});

test("cluster vocabulary is flagged at rung 3, case-insensitive, deduped per sentence", () => {
  const t = findTells("We Delve into the intricate tapestry and delve again.");
  assert.deepEqual(t.map((x) => x.kind), ['vocab "delve"', 'vocab "intricate"', 'vocab "tapestry"']);
});

test("tells inside code are not flagged", () => {
  assert.deepEqual(findTells("Run `git delve` in a `a—b` span.\n```\ndelve — x\n```"), []);
});

test("a plain word that merely contains a cluster stem is not flagged", () => {
  assert.deepEqual(findTells("The underscored value is fine."), []); // word boundary: not "underscore"
});
