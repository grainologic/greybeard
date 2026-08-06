import assert from "node:assert/strict";
import { test } from "node:test";
import { type ChurnState, formatChurn, recordFailure, signature } from "../lib/churn.ts";

test("a named path is the target, case-folded", () => {
  assert.equal(signature("read", { path: "Data/Corrupt.BIN" }), "data/corrupt.bin");
});

test("the last path-like operand anchors a command", () => {
  assert.equal(signature("bash", { command: "python parse.py data/corrupt.bin" }), "data/corrupt.bin");
});

test("flags and env assignments are not operands", () => {
  assert.equal(signature("bash", { command: "PYTHONPATH=. gzip -d --force archive.gz" }), "archive.gz");
});

test("a redirect target is not the target", () => {
  assert.equal(signature("bash", { command: "xxd dump.bin > /tmp/out.txt" }), "dump.bin");
});

test("only the first segment of a chain counts", () => {
  assert.equal(signature("bash", { command: "head -c 64 blob.dat && python retry.py other.dat" }), "blob.dat");
});

test("with no path anywhere the program is the target", () => {
  assert.equal(signature("bash", { command: "cmake --build" }), "cmake");
});

test("quotes are stripped so the same file is one target", () => {
  assert.equal(signature("bash", { command: 'cat "my file.log"' }), "my file.log");
});

test("the tool name is the last resort", () => {
  assert.equal(signature("grep", {}), "grep");
});

test("nothing fires before the third failure, then it fires once", () => {
  const s: ChurnState = new Map();
  assert.equal(recordFailure(s, "a.bin", 10), undefined);
  assert.equal(recordFailure(s, "a.bin", 10), undefined);
  const v = recordFailure(s, "a.bin", 10);
  assert.deepEqual(v, { target: "a.bin", failures: 3, escalating: false });
});

test("it re-arms at six and goes silent after", () => {
  const s: ChurnState = new Map();
  const fired: number[] = [];
  for (let i = 0; i < 12; i++) {
    const v = recordFailure(s, "a.bin", 10);
    if (v) fired.push(v.failures);
  }
  assert.deepEqual(fired, [3, 6]);
});

test("targets are counted apart", () => {
  const s: ChurnState = new Map();
  for (let i = 0; i < 2; i++) {
    recordFailure(s, "a.bin", 10);
    recordFailure(s, "b.bin", 10);
  }
  assert.equal(recordFailure(s, "a.bin", 10)?.failures, 3);
  assert.equal(recordFailure(s, "b.bin", 10)?.failures, 3);
});

test("a command grown half again past its first failure reads as escalating", () => {
  const s: ChurnState = new Map();
  recordFailure(s, "a.bin", 20);
  recordFailure(s, "a.bin", 25);
  assert.equal(recordFailure(s, "a.bin", 30)?.escalating, true);
});

test("a steady command length is not escalation", () => {
  const s: ChurnState = new Map();
  recordFailure(s, "a.bin", 20);
  recordFailure(s, "a.bin", 20);
  assert.equal(recordFailure(s, "a.bin", 21)?.escalating, false);
});

test("the note names the target and the count, and stays quiet about length until it grows", () => {
  const plain = formatChurn({ target: "a.bin", failures: 3, escalating: false });
  assert.match(plain, /3 failures on `a\.bin`/);
  assert.match(plain, /measures the route/);
  assert.equal(plain.includes("longer than the first"), false);
  assert.match(formatChurn({ target: "a.bin", failures: 3, escalating: true }), /longer than the first/);
});
