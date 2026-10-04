import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { findTells, formatTells } from "../lib/tells.ts";

const WRITING = readFileSync(join(import.meta.dirname, "..", "standards", "writing.md"), "utf8");

// The rule labels in writing.md, normalized to the finding-id form. Bold label
// followed by a period; the question-form labels in the rails section do not match.
const ruleNames = new Set(
  [...WRITING.matchAll(/\*\*([A-Z][^.?]*?)\.\*\*/g)].map((m) => m[1].trim().toLowerCase().replace(/\s+/g, "-")),
);

test("clean prose yields no tells (silence, not a clean signal)", () => {
  assert.deepEqual(findTells("The parser reads the file in chunks and yields each record."), []);
});

test("em-dash is flagged by id with its sentence and a fix", () => {
  const t = findTells("This one—leaks.");
  assert.equal(t.length, 1);
  assert.equal(t[0].id, "em-dash");
  assert.equal(t[0].sentence, "This one—leaks.");
  assert.match(t[0].fix, /period, comma, colon, or parentheses/);
});

test("cluster vocabulary is flagged by id, case-insensitive, deduped across the file", () => {
  const t = findTells("We Delve into the intricate tapestry.\n\nThen delve again, twice.");
  assert.deepEqual(
    t.map((x) => [x.id, x.text]),
    [
      ["ai-vocabulary", "delve"],
      ["ai-vocabulary", "intricate"],
      ["ai-vocabulary", "tapestry"],
    ],
  );
});

test("tells inside inline code and fences are not flagged", () => {
  assert.deepEqual(findTells("Run `git delve` in a `a—b` span.\n```\ndelve — x\n```"), []);
});

test("backticked and fenced text is the quotation exemption", () => {
  // A standard has to be able to name what it bans. Same strings, opposite formatting.
  assert.deepEqual(findTells("Never write `testament` or `pivotal`."), []);
  assert.equal(findTells('Never write "testament" or "pivotal".').length, 2);
});

test("a plain word that merely contains a cluster stem is not flagged", () => {
  assert.deepEqual(findTells("The underscored value is fine."), []);
});

test("full templates are flagged, and suppress the vocabulary hit inside them", () => {
  const t = findTells("It stands as a testament to the design.");
  assert.deepEqual(
    t.map((x) => [x.id, x.text]),
    [["inflated-significance", "stands as a testament"]],
  );
});

test("announcing reflexes and performed enthusiasm are flagged", () => {
  const ids = findTells("Please note the limit. As an AI I cannot run it. Great question.").map((x) => x.id);
  assert.deepEqual([...new Set(ids)].sort(), ["announcing-reflexes", "performed-enthusiasm"]);
});

test("formatTells emits only the fixes for findings that fired", () => {
  const note = formatTells(findTells("We delve into the tapestry."));
  assert.doesNotMatch(note, /em-dash/);
  assert.doesNotMatch(note, /paragraph/);
  assert.match(note, /ai-vocabulary "delve"/);
  assert.match(note, /Use the plain word\./);
});

test("a paragraph past 250 words is flagged, and a list of the same length is not", () => {
  const t = findTells(`${"word ".repeat(260).trim()}.`);
  assert.equal(t.length, 1);
  assert.equal(t[0].id, "padding-structure");
  assert.match(t[0].fix, /250/);
  const list = Array.from({ length: 260 }, (_, i) => `- item ${i}`).join("\n");
  assert.deepEqual(findTells(list), []);
});

test("every id the detector can emit names a rule in writing.md", () => {
  // The coupling between the two files. A finding id that names no rule is drift,
  // and this fails on it instead of on a reader noticing later.
  const long = `${"word ".repeat(260).trim()}.`;
  const probe = `This one—leaks. We delve into the tapestry. It stands as a testament. Please note the limit. As an AI I cannot.\n\n${long}`;
  const ids = new Set(findTells(probe).map((x) => x.id));
  assert.deepEqual(
    [...ids].sort(),
    ["ai-vocabulary", "announcing-reflexes", "em-dash", "inflated-significance", "padding-structure", "performed-enthusiasm"],
  );
  for (const id of ids) assert.ok(ruleNames.has(id), `finding id "${id}" names no rule in writing.md`);
});

test("the rule-name extractor actually found the rules", () => {
  // Guard on the guard: an extractor that silently matched nothing would pass the test above.
  for (const name of ["em-dash", "ai-vocabulary", "inflated-significance", "announcing-reflexes", "performed-enthusiasm", "padding-structure"]) {
    assert.ok(ruleNames.has(name), `writing.md rule "${name}" not found by the extractor`);
  }
});
