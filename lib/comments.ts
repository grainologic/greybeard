// Comment finder for the glyph cleanup in typography.ts.
//
// Finds the comment bodies of a source file and nothing else. String literals are
// skipped rather than scanned, so `//` inside a URL or `#` inside a shell parameter
// expansion never opens a comment, and an unrecognized file is returned untouched
// instead of guessed at.
//
// This is a single left-to-right pass, not a lexer: it knows delimiters, not
// language semantics. Two known limits, both bounded by the caller being ASCII-safe
// (a mis-scan can only ever change a non-ASCII character): raw and heredoc strings
// (C++ `R"(...)"`, Rust `r#"..."#`, shell `<<EOF`) read as ordinary strings, and a
// Python docstring is a string here, not a comment, so it is left verbatim.

interface Syntax {
  line: string[]; // line-comment openers
  block: [string, string][]; // block-comment delimiter pairs, checked before line openers
  strings: string[]; // string delimiters, longest first
  escape: boolean; // backslash escapes inside strings
}

const C_LIKE: Syntax = { line: ["//"], block: [["/*", "*/"]], strings: ['"', "'", "`"], escape: true };
const HASH: Syntax = { line: ["#"], block: [], strings: ['"""', "'''", '"', "'"], escape: true };
const SQL: Syntax = { line: ["--"], block: [["/*", "*/"]], strings: ["'", '"'], escape: false };
const LUA: Syntax = { line: ["--"], block: [["--[[", "]]"]], strings: ['"', "'"], escape: true };
const CSS: Syntax = { line: [], block: [["/*", "*/"]], strings: ['"', "'"], escape: true };
const XML: Syntax = { line: [], block: [["<!--", "-->"]], strings: [], escape: false };
const LISP: Syntax = { line: [";"], block: [], strings: ['"'], escape: true };

// Extensions a coding agent actually writes. Unknown extension means no cleanup,
// which is the safe direction: a language whose strings we cannot find is a language
// whose comments we should not edit.
const BY_EXT: Record<string, Syntax> = {};
const register = (syn: Syntax, exts: string) => {
  for (const e of exts.split(" ")) BY_EXT[e] = syn;
};
register(C_LIKE, "ts tsx mts cts js jsx mjs cjs c h cc cpp cxx hpp hh hxx cs java go rs swift kt kts scala php dart m mm proto groovy gradle glsl hlsl zig scss less");
register(HASH, "py pyi rb sh bash zsh ps1 psm1 pl pm r jl yaml yml toml ini cfg conf tf tfvars mk cmake gitconfig");
register(SQL, "sql");
register(LUA, "lua");
register(CSS, "css");
register(XML, "html htm xml xhtml svg vue svelte");
register(LISP, "el lisp clj cljs cljc scm asm s");

const BY_NAME: Record<string, Syntax> = {
  makefile: HASH,
  dockerfile: HASH,
  "cmakelists.txt": HASH,
  ".gitconfig": HASH,
};

function syntaxFor(path: string): Syntax | undefined {
  const name = path.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
  const byName = BY_NAME[name];
  if (byName) return byName;
  const dot = name.lastIndexOf(".");
  return dot < 0 ? undefined : BY_EXT[name.slice(dot + 1)];
}

// Index just past the closing delimiter. A single-quote string that never closes on
// its line is an apostrophe in code, not a string, so the scan resumes at the newline
// rather than swallowing the rest of the file.
function endOfString(text: string, start: number, quote: string, escape: boolean): number {
  const multiline = quote.length > 1 || quote === "`";
  let i = start + quote.length;
  while (i < text.length) {
    if (escape && text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text.startsWith(quote, i)) return i + quote.length;
    if (!multiline && text[i] === "\n") return i;
    i++;
  }
  return text.length;
}

// Rewrite every comment body through fn, leave every other byte alone. Comment
// delimiters are outside the body, so fn cannot break `//` into `/ /` or close a
// block early. Returns text unchanged for a language with no entry above.
export function mapComments(text: string, path: string, fn: (body: string) => string): string {
  const syn = syntaxFor(path);
  if (!syn) return text;

  let out = "";
  let cut = 0; // text before this index is already accounted for in out
  let i = 0;
  while (i < text.length) {
    const quote = syn.strings.find((q) => text.startsWith(q, i));
    if (quote) {
      i = endOfString(text, i, quote, syn.escape);
      continue;
    }
    const block = syn.block.find(([open]) => text.startsWith(open, i));
    if (block) {
      const from = i + block[0].length;
      const close = text.indexOf(block[1], from);
      const to = close < 0 ? text.length : close;
      out += text.slice(cut, from) + fn(text.slice(from, to));
      cut = to;
      i = close < 0 ? text.length : close + block[1].length;
      continue;
    }
    const line = syn.line.find((open) => text.startsWith(open, i));
    if (line) {
      const from = i + line.length;
      const eol = text.indexOf("\n", from);
      const to = eol < 0 ? text.length : eol;
      out += text.slice(cut, from) + fn(text.slice(from, to));
      cut = to;
      i = to;
      continue;
    }
    i++;
  }
  return out + text.slice(cut);
}
