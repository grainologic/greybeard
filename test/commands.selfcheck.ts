import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Drift check: the code is the source of truth. Every /greybeard subcommand the
// handler actually dispatches must appear in both the in-app help card and the
// README commands table. Extraction is by text, so this file stays pi-free.
const src = readFileSync(fileURLToPath(new URL("../index.ts", import.meta.url)), "utf8");
const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");

// "?" is a help alias, "panel" is the no-arg behaviour; neither is a user-facing verb.
const INTERNAL = new Set(["?", "panel"]);

const found = new Set<string>();
for (const re of [
  /\bsub === "([a-z?]+)"/g, // sub === "status"
  /\bsub\.startsWith\("([a-z]+) "\)/g, // sub.startsWith("prefix ")
  /\bsub !== "([a-z]+)"/g, // sub !== "panel"
  /\bcase "([a-z]+)":/g, // apply() switch
]) {
  for (const m of src.matchAll(re)) found.add(m[1]);
}
const commands = [...found].filter((c) => !INTERNAL.has(c)).sort();

const helpBlock = (() => {
  const start = src.indexOf("const HELP");
  return src.slice(start, src.indexOf("];", start));
})();
const readmeCommands = (() => {
  const start = readme.indexOf("## Commands");
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
})();

const word = (c: string) => new RegExp(`\\b${c}\\b`);

// Guard against a broken extractor: if the regexes matched nothing the two
// checks below would pass vacuously, which is worse than no test.
test("extractor finds the known subcommands", () => {
  for (const c of ["code", "prose", "test", "on", "off", "prefix", "default", "reset", "status", "help"]) {
    assert.ok(commands.includes(c), `extractor missed '${c}' (regex drift?)`);
  }
});

test("every subcommand is in the help card", () => {
  const missing = commands.filter((c) => !word(c).test(helpBlock));
  assert.deepEqual(missing, [], `undocumented in HELP: ${missing.join(", ")}`);
});

test("every subcommand is in the README commands table", () => {
  const missing = commands.filter((c) => !word(c).test(readmeCommands));
  assert.deepEqual(missing, [], `undocumented in README: ${missing.join(", ")}`);
});
