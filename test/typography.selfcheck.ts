import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSourceComments, cleanTypography } from "../lib/typography.ts";

const cp = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

test("strips emoji and closes the gap", () => {
  assert.equal(cleanTypography("Ship it 🚀 now"), "Ship it now");
});

test("tight word en-dash becomes a hyphen, numeric range is kept", () => {
  assert.equal(cleanTypography("re–run pages 1–10"), "re-run pages 1–10");
});

test("curly quotes and apostrophes become straight", () => {
  assert.equal(cleanTypography("“it’s” a test"), `"it's" a test`);
});

test("em-dash is left for the tell detector, never substituted", () => {
  const t = "This is fine—or is it?";
  assert.ok(cleanTypography(t).includes("—"), "cleanTypography does not touch em-dashes");
});

test("code is never touched (fenced and inline)", () => {
  const t = "Use `a—b` inline.\n```\nx = 1 🚀 — 2\n```\n";
  const out = cleanTypography(t);
  assert.ok(out.includes("`a—b`"), "inline code preserved");
  assert.ok(out.includes("x = 1 🚀 — 2"), "fenced code preserved");
});

test("preserves the space before an inline code span (regression)", () => {
  assert.equal(cleanTypography("7-char `shortuuid` strings"), "7-char `shortuuid` strings");
});

test("emoji beside a code span keeps single spacing and the code", () => {
  assert.equal(cleanTypography("done 🚀 `run()` now"), "done `run()` now");
});

test("ASCII is a fixed point: nothing a keyboard types is rewritten", () => {
  const t = "if (a <= b && c != d) { x->y = 'q'; } // 3 x 4, a-b, ...\n";
  assert.equal(cleanTypography(t), t);
  assert.equal(cleanSourceComments(t, "a.ts"), t);
});

test("arrows and comparisons get their keyboard spelling", () => {
  assert.equal(cleanTypography("a → b, c ← d, e ↔ f"), "a -> b, c <- d, e <-> f");
  assert.equal(cleanTypography("x ≤ y ≥ z ≠ w ≈ v"), "x <= y >= z != w ~ v");
  assert.equal(cleanTypography("p ⇒ q ⇔ r"), "p => q <=> r");
});

test("arithmetic and punctuation marks are spelled out", () => {
  assert.equal(cleanTypography("1920×1080, 6÷2, ±3, wait…"), "1920x1080, 6/2, +/-3, wait...");
});

test("guillemets, primes, and low quotes become straight quotes", () => {
  assert.equal(cleanTypography("«a» ‹b› 5′ 6″ „c‟"), `"a" 'b' 5' 6" "c"`);
});

test("bullet ornaments become hyphens", () => {
  assert.equal(cleanTypography("• one\n‣ two\n◦ three"), "- one\n- two\n- three");
});

test("ligatures from pasted PDFs are expanded", () => {
  assert.equal(cleanTypography("the ﬁrst ﬂag is ﬀ"), "the first flag is ff");
});

test("invisible marks are removed", () => {
  const t = `word${cp(0x200b)}break${cp(0x00ad)} and${cp(0xfeff)} more${cp(0x2060)}`;
  assert.equal(cleanTypography(t), "wordbreak and more");
});

test("exotic spaces collapse to one plain space, separators included", () => {
  const t = `a${cp(0x00a0)}b${cp(0x2009)}c${cp(0x3000)}d${cp(0x2028)}e`;
  assert.equal(cleanTypography(t), "a b c d e");
});

test("fullwidth ASCII maps back", () => {
  assert.equal(cleanTypography("ｒｕｎ（ｘ）；"), "run(x);");
});

test("em-dash lookalikes normalize to the em-dash so the detector sees them", () => {
  assert.equal(cleanTypography("a ― b"), "a — b");
  assert.equal(cleanTypography("a ⸻ b"), "a — b");
});

test("source file: comments are cleaned, code and strings are not", () => {
  const src = [
    "// arrow → here",
    'const quote = "keep the “curly” ones";',
    "const arrow = '→';",
    "/* block “quoted” and 1 ≤ 2 */",
    "run(); // trailing … tail",
  ].join("\n");
  const out = cleanSourceComments(src, "app.ts");
  assert.ok(out.includes("// arrow -> here"), "line comment cleaned");
  assert.ok(out.includes('"keep the “curly” ones"'), "string literal untouched");
  assert.ok(out.includes("const arrow = '→';"), "single-quoted literal untouched");
  assert.ok(out.includes('/* block "quoted" and 1 <= 2 */'), "block comment cleaned");
  assert.ok(out.includes("// trailing ... tail"), "trailing comment cleaned");
});

test("source file: a URL inside a string does not open a comment", () => {
  const src = 'const u = "https://example.com/a→b";\n';
  assert.equal(cleanSourceComments(src, "app.js"), src);
});

test("source file: python and shell comments, docstrings left alone", () => {
  const py = '# hits ≥ 3\nDOC = """keep the → arrow"""\nx = 1  # and ≤ 2\n';
  const out = cleanSourceComments(py, "tool.py");
  assert.ok(out.includes("# hits >= 3"), "hash comment cleaned");
  assert.ok(out.includes('"""keep the → arrow"""'), "docstring untouched");
  assert.ok(out.includes("# and <= 2"), "trailing hash comment cleaned");
});

test("source file: unknown extension is returned untouched", () => {
  const t = "// arrow → here\n";
  assert.equal(cleanSourceComments(t, "notes.weird"), t);
});

test("source file: emoji in a comment goes, emoji in a string stays", () => {
  const src = 'log("done 🚀"); // shipped 🚀 today\n';
  const out = cleanSourceComments(src, "app.ts");
  assert.ok(out.includes('log("done 🚀");'), "string emoji kept");
  assert.ok(out.includes("// shipped today"), "comment emoji removed");
});

test("source file: em-dash in a comment is left alone like everywhere else", () => {
  const src = "// this is fine—or is it\n";
  assert.equal(cleanSourceComments(src, "app.ts"), src);
});

test("tally counts the work by category, and counts only prose regions", () => {
  const tally: Record<string, number> = {};
  cleanTypography("“a” → b 🚀 and `c → d`", tally);
  assert.deepEqual(tally, { substituted: 3, emoji: 1 });
  const src: Record<string, number> = {};
  cleanSourceComments('x = "→"; // a → b ≤ c\n', "a.ts", src);
  assert.deepEqual(src, { substituted: 2 });
});
