import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { languageFor } from "../lib/languages.ts";

test("an extension maps to its slug", () => {
  assert.equal(languageFor("scanner.py"), "python");
  assert.equal(languageFor("src/cache.js"), "javascript");
  assert.equal(languageFor("main.go"), "go");
});

test("extensions sharing a standard library share a slug", () => {
  for (const p of ["a.ts", "a.tsx", "a.mjs", "a.cjs", "a.jsx"]) {
    assert.equal(languageFor(p), "javascript", p);
  }
  assert.equal(languageFor("a.cpp"), languageFor("a.hpp"));
});

test("case and separator do not matter", () => {
  assert.equal(languageFor("SRC\\Deep\\Thing.PY"), "python");
  assert.equal(languageFor("C:/work/App.CS"), "csharp");
});

test("no extension, an unknown one, and a bare dotfile map to nothing", () => {
  assert.equal(languageFor("Makefile"), undefined);
  assert.equal(languageFor("notes.md"), undefined);
  assert.equal(languageFor(".gitignore"), undefined);
  assert.equal(languageFor(""), undefined);
});

test("every notes file that ships has an extension pointing at it", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "standards", "lang");
  const slugs = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  assert.ok(slugs.length, "no language notes found");
  const reachable = new Set(
    [".py", ".js", ".ts", ".go", ".rs", ".java", ".kt", ".swift", ".rb", ".php", ".cs",
     ".c", ".cpp", ".sh", ".ps1", ".sql", ".lua", ".dart", ".scala", ".ex", ".r", ".pl", ".hs"]
      .map((e) => languageFor(`x${e}`)),
  );
  for (const slug of slugs) assert.ok(reachable.has(slug), `${slug}.md is unreachable`);
});

test("notes stay short enough to be a nudge", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "standards", "lang");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const body = readFileSync(join(dir, f), "utf8");
    const bullets = body.split("\n").filter((l) => l.startsWith("- "));
    assert.equal(bullets.length, 5, `${f} should carry 5 points, found ${bullets.length}`);
    assert.ok(body.length < 900, `${f} is ${body.length} chars, too long for a nudge`);
  }
});
