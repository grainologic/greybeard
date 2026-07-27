import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanTypography, findEmDashSentences } from "../lib/typography.ts";

test("strips emoji and closes the gap", () => {
  assert.equal(cleanTypography("Ship it 🚀 now"), "Ship it now");
});

test("tight word en-dash becomes a hyphen, numeric range is kept", () => {
  assert.equal(cleanTypography("re–run pages 1–10"), "re-run pages 1–10");
});

test("em-dash is left for rephrase, never substituted", () => {
  const t = "This is fine—or is it?";
  assert.ok(cleanTypography(t).includes("—"));
  assert.deepEqual(findEmDashSentences(t), ["This is fine—or is it?"]);
});

test("code is never touched (fenced and inline)", () => {
  const t = "Use `a—b` inline.\n```\nx = 1 🚀 — 2\n```\n";
  const out = cleanTypography(t);
  assert.ok(out.includes("`a—b`"), "inline code preserved");
  assert.ok(out.includes("x = 1 🚀 — 2"), "fenced code preserved");
  assert.deepEqual(findEmDashSentences(t), [], "em-dashes inside code are not queued");
});

test("preserves the space before an inline code span (regression)", () => {
  assert.equal(cleanTypography("7-char `shortuuid` strings"), "7-char `shortuuid` strings");
});

test("emoji beside a code span keeps single spacing and the code", () => {
  assert.equal(cleanTypography("done 🚀 `run()` now"), "done `run()` now");
});

test("only leaked sentences are returned, one per em-dash sentence", () => {
  const t = "Clean sentence here. This one—leaks. Also clean.";
  assert.deepEqual(findEmDashSentences(t), ["This one—leaks."]);
});
