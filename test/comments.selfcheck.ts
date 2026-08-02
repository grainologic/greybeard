import assert from "node:assert/strict";
import { test } from "node:test";
import { mapComments } from "../lib/comments.ts";

// Mark every comment body the scanner finds, so a test reads as "what did it call a comment".
const mark = (text: string, path: string) => mapComments(text, path, (body) => `<${body}>`);

test("c-like: line and block comments, delimiters left outside the body", () => {
  assert.equal(mark("a // one\n", "a.ts"), "a //< one>\n");
  assert.equal(mark("a /* two */ b", "a.ts"), "a /*< two >*/ b");
});

test("c-like: comment openers inside strings are not comments", () => {
  const t = 'const u = "http://x.dev"; // real\n';
  assert.equal(mark(t, "a.js"), 'const u = "http://x.dev"; //< real>\n');
  assert.equal(mark('s = "/* not a comment */";', "a.ts"), 's = "/* not a comment */";');
});

test("c-like: escaped quote does not end the string early", () => {
  assert.equal(mark('s = "a\\" // b"; // c\n', "a.ts"), 's = "a\\" // b"; //< c>\n');
});

test("template literal is a string, backtick spans lines", () => {
  assert.equal(mark("s = `a\n// b\n`; // c\n", "a.ts"), "s = `a\n// b\n`; //< c>\n");
});

test("an unterminated single quote is an apostrophe, not a string that eats the file", () => {
  const t = "# don't stop\n# next ≥ line\n";
  assert.equal(mark(t, "a.py"), "#< don't stop>\n#< next ≥ line>\n");
});

test("python: triple-quoted docstring is a string, hash is a comment", () => {
  assert.equal(mark('d = """# not a comment"""\n# yes\n', "a.py"), 'd = """# not a comment"""\n#< yes>\n');
});

test("hash languages do not treat // or /* as comments", () => {
  assert.equal(mark("path = /usr/bin # note\n", "a.sh"), "path = /usr/bin #< note>\n");
});

test("c-like does not treat # as a comment, so the preprocessor survives", () => {
  assert.equal(mark("#include <stdio.h> // yes\n", "a.c"), "#include <stdio.h> //< yes>\n");
});

test("lua block opener wins over its line opener", () => {
  assert.equal(mark("--[[ a ]] -- b\n", "a.lua"), "--[[< a >]] --< b>\n");
});

test("sql, css, xml, and lisp each find their own comment", () => {
  assert.equal(mark("select 1 -- note\n", "a.sql"), "select 1 --< note>\n");
  assert.equal(mark("a { } /* note */", "a.css"), "a { } /*< note >*/");
  assert.equal(mark("<p>x</p><!-- note -->", "a.html"), "<p>x</p><!--< note >-->");
  assert.equal(mark("(f x) ; note\n", "a.el"), "(f x) ;< note>\n");
});

test("unterminated block comment runs to end of file", () => {
  assert.equal(mark("a /* tail", "a.ts"), "a /*< tail>");
});

test("comment at end of file without a newline is still found", () => {
  assert.equal(mark("a // tail", "a.ts"), "a //< tail>");
});

test("unknown language and extensionless paths are returned verbatim", () => {
  assert.equal(mark("// x\n", "a.weird"), "// x\n");
  assert.equal(mark("// x\n", "README"), "// x\n");
});

test("filename-matched languages work, and a windows path resolves", () => {
  assert.equal(mark("all: # note\n", "Makefile"), "all: #< note>\n");
  assert.equal(mark("all: # note\n", "C:\\proj\\src\\Makefile"), "all: #< note>\n");
});

test("nothing outside comments is rewritten, whatever fn does", () => {
  const src = 'x = 1; // a\ny = "z"; /* b */\n';
  assert.equal(mapComments(src, "a.ts", () => ""), 'x = 1; //\ny = "z"; /**/\n');
});
